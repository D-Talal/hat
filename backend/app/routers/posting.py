from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import date
from typing import Optional, List
from app.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.models.posting import (
    PostingRun, PostingEntry, FxRate, IpcHistory,
    Ifrs16Schedule, Ifrs16ScheduleLine,
)
from app.services.posting_engine import (
    execute_posting_run, apply_ipc, build_ifrs16_schedule, calc_sales_rent,
)

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class RunPostingRequest(BaseModel):
    period_from: date
    period_to:   date
    module:      Optional[str] = "all"
    dry_run:     Optional[bool] = False

class IpcRequest(BaseModel):
    contract_id:  int
    new_index:    float
    applied_date: date

class Ifrs16Request(BaseModel):
    contract_id:          int
    discount_rate:        float
    initial_direct_costs: Optional[float] = 0

class FxRateCreate(BaseModel):
    from_currency: str
    to_currency:   str
    rate:          float
    valid_date:    date

class SalesSimulateRequest(BaseModel):
    sales_rule_id:   int
    declared_amount: float


# ── Posting Run ───────────────────────────────────────────────────────────────

@router.post("/run")
def run_posting(data: RunPostingRequest, db: Session = Depends(get_db),
                u=Depends(require_permission("create"))):
    """
    Execute a RERAPP-style posting run.
    dry_run=True: calculates but does not persist entries.
    """
    if data.period_from > data.period_to:
        raise HTTPException(400, "period_from must be before period_to")
    run = execute_posting_run(
        db, data.period_from, data.period_to,
        data.module, data.dry_run, u.id
    )
    return {
        "id":            run.id,
        "status":        run.status,
        "dry_run":       run.dry_run,
        "period_from":   run.period_from,
        "period_to":     run.period_to,
        "module":        run.module,
        "total_entries": run.total_entries,
        "total_amount":  float(run.total_amount or 0),
        "error_count":   run.error_count,
        "errors":        run.errors,
        "summary":       run.summary,
        "completed_at":  run.completed_at,
    }


@router.get("/runs")
def list_runs(db: Session = Depends(get_db), u=Depends(get_current_user)):
    runs = db.query(PostingRun).order_by(PostingRun.started_at.desc()).limit(50).all()
    return [{"id": r.id, "period_from": r.period_from, "period_to": r.period_to,
             "module": r.module, "status": r.status, "dry_run": r.dry_run,
             "total_entries": r.total_entries, "total_amount": float(r.total_amount or 0),
             "error_count": r.error_count, "started_at": r.started_at,
             "completed_at": r.completed_at, "summary": r.summary} for r in runs]


@router.get("/runs/{run_id}/entries")
def get_run_entries(run_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    entries = db.query(PostingEntry).filter(PostingEntry.posting_run_id == run_id).all()
    return [{"id": e.id, "entry_type": e.entry_type, "amount": float(e.amount),
             "currency": e.currency, "amount_base": float(e.amount_base or 0),
             "period_from": e.period_from, "period_to": e.period_to,
             "description": e.description, "contract_id": e.contract_id,
             "is_catchup": e.is_catchup, "posted": e.posted} for e in entries]


# ── IPC ───────────────────────────────────────────────────────────────────────

@router.post("/ipc/apply")
def apply_ipc_revision(data: IpcRequest, db: Session = Depends(get_db),
                        u=Depends(require_permission("update"))):
    history = apply_ipc(db, data.contract_id, data.new_index, data.applied_date)
    return {
        "id":                  history.id,
        "contract_id":         history.contract_id,
        "applied_date":        history.applied_date,
        "old_index":           history.old_index,
        "new_index":           history.new_index,
        "revision_pct":        round(history.revision_pct, 4),
        "conditions_updated":  history.conditions_updated,
    }


@router.get("/ipc/history")
def get_ipc_history(contract_id: Optional[int] = None,
                    db: Session = Depends(get_db), u=Depends(get_current_user)):
    q = db.query(IpcHistory)
    if contract_id: q = q.filter(IpcHistory.contract_id == contract_id)
    rows = q.order_by(IpcHistory.applied_date.desc()).all()
    return [{"id": r.id, "contract_id": r.contract_id, "applied_date": r.applied_date,
             "old_index": r.old_index, "new_index": r.new_index,
             "revision_pct": round(r.revision_pct, 4),
             "conditions_updated": r.conditions_updated} for r in rows]


# ── IFRS 16 ──────────────────────────────────────────────────────────────────

@router.post("/ifrs16/setup")
def setup_ifrs16(data: Ifrs16Request, db: Session = Depends(get_db),
                  u=Depends(require_permission("create"))):
    """Initial recognition of an IFRS 16 lease — builds full amortization schedule."""
    existing = db.query(Ifrs16Schedule).filter(
        Ifrs16Schedule.contract_id == data.contract_id
    ).first()
    if existing:
        raise HTTPException(400, "IFRS16 schedule already exists for this contract. Delete it first to recalculate.")
    sched = build_ifrs16_schedule(db, data.contract_id, data.discount_rate, data.initial_direct_costs)
    return {
        "id":               sched.id,
        "contract_id":      sched.contract_id,
        "discount_rate":    sched.discount_rate,
        "initial_liability": float(sched.initial_liability),
        "initial_rou":      float(sched.initial_rou),
        "recognition_date": sched.recognition_date,
        "currency":         sched.currency,
        "useful_life_months": sched.rou_useful_life_months,
    }


@router.get("/ifrs16/schedules")
def list_ifrs16_schedules(db: Session = Depends(get_db), u=Depends(get_current_user)):
    rows = db.query(Ifrs16Schedule).all()
    return [{"id": s.id, "contract_id": s.contract_id, "discount_rate": s.discount_rate,
             "initial_liability": float(s.initial_liability or 0),
             "initial_rou": float(s.initial_rou or 0),
             "liability_balance": float(s.liability_balance or 0),
             "rou_balance": float(s.rou_balance or 0),
             "accumulated_amort": float(s.accumulated_amort or 0),
             "recognition_date": s.recognition_date, "currency": s.currency,
             "last_posted_date": s.last_posted_date} for s in rows]


@router.get("/ifrs16/schedules/{schedule_id}/lines")
def get_ifrs16_lines(schedule_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    lines = db.query(Ifrs16ScheduleLine).filter(
        Ifrs16ScheduleLine.schedule_id == schedule_id
    ).order_by(Ifrs16ScheduleLine.period_date).all()
    return [{"period_date": l.period_date, "lease_payment": float(l.lease_payment or 0),
             "interest_charge": float(l.interest_charge or 0),
             "liability_repay": float(l.liability_repay or 0),
             "liability_close": float(l.liability_close or 0),
             "rou_amort": float(l.rou_amort or 0),
             "rou_close": float(l.rou_close or 0),
             "posted": l.posted} for l in lines]


@router.delete("/ifrs16/schedules/{contract_id}")
def delete_ifrs16_schedule(contract_id: int, db: Session = Depends(get_db),
                            u=Depends(require_permission("delete"))):
    sched = db.query(Ifrs16Schedule).filter(Ifrs16Schedule.contract_id == contract_id).first()
    if not sched: raise HTTPException(404, "Not found")
    db.query(Ifrs16ScheduleLine).filter(Ifrs16ScheduleLine.schedule_id == sched.id).delete()
    db.delete(sched); db.commit()
    return {"ok": True}


# ── FX Rates ─────────────────────────────────────────────────────────────────

@router.get("/fx-rates")
def list_fx_rates(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.query(FxRate).order_by(FxRate.valid_date.desc()).limit(100).all()

@router.post("/fx-rates")
def create_fx_rate(data: FxRateCreate, db: Session = Depends(get_db),
                    u=Depends(require_permission("create"))):
    rate = FxRate(**data.dict())
    db.add(rate); db.commit(); db.refresh(rate)
    return rate


# ── Sales Simulation ──────────────────────────────────────────────────────────

@router.post("/sales/simulate")
def simulate_sales_rent(data: SalesSimulateRequest, db: Session = Depends(get_db),
                         u=Depends(get_current_user)):
    """Simulate sales-based rent for a given CA declaration (without posting)."""
    from app.models.retail import SalesRule
    from decimal import Decimal
    rule = db.query(SalesRule).filter(SalesRule.id == data.sales_rule_id).first()
    if not rule: raise HTTPException(404, "SalesRule not found")
    rent = calc_sales_rent(rule, Decimal(str(data.declared_amount)))
    return {
        "sales_rule_id":    rule.id,
        "calc_mode":        rule.calc_mode,
        "declared_amount":  data.declared_amount,
        "calculated_rent":  float(rent),
        "min_rent":         float(rule.min_rent) if rule.min_rent else None,
        "max_rent":         float(rule.max_rent) if rule.max_rent else None,
        "rate_pct":         rule.rate_pct,
    }


# ── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def posting_stats(db: Session = Depends(get_db), u=Depends(get_current_user)):
    total_runs     = db.query(PostingRun).count()
    last_run       = db.query(PostingRun).filter(PostingRun.dry_run == False).order_by(PostingRun.started_at.desc()).first()
    total_posted   = db.query(func.sum(PostingEntry.amount)).filter(PostingEntry.posted == True).scalar() or 0
    pending_ifrs16 = db.query(Ifrs16ScheduleLine).filter(Ifrs16ScheduleLine.posted == False).count()
    return {
        "total_runs":     total_runs,
        "last_run_date":  last_run.completed_at if last_run else None,
        "last_run_period": f"{last_run.period_from} → {last_run.period_to}" if last_run else None,
        "total_posted_amount": float(total_posted),
        "pending_ifrs16_lines": pending_ifrs16,
        "active_schedules": db.query(Ifrs16Schedule).count(),
    }
