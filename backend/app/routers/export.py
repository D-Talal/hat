"""
CSV exports for commercial data (contracts, invoices, conditions).

Pure-Python CSV (no openpyxl/pandas dependency) so there's nothing extra to
install on Render. Files open directly in Excel; a UTF-8 BOM is prepended so
accented characters render correctly.
"""
import io
import csv
from datetime import date, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.core.deps import get_current_user, get_current_org
from app.models.retail import (
    Contract, Condition, Invoice, BusinessPartner, BusinessEntity,
)

router = APIRouter()


def _enum(v):
    """Render an enum/value safely as a plain string."""
    if v is None:
        return ""
    return v.value if hasattr(v, "value") else str(v)


def _d(v):
    """Format a date/datetime as ISO, else empty."""
    if isinstance(v, (date, datetime)):
        return v.isoformat()[:10]
    return "" if v is None else str(v)


def _csv_response(rows, headers, filename):
    """Build a UTF-8 (BOM) CSV streaming response from rows of dicts."""
    buf = io.StringIO()
    buf.write("\ufeff")  # BOM so Excel detects UTF-8
    writer = csv.DictWriter(buf, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/contracts")
def export_contracts(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    contracts = (
        db.query(Contract)
        .join(BusinessEntity, BusinessEntity.id == Contract.business_entity_id)
        .filter(BusinessEntity.org_id == org.id)
        .options(joinedload(Contract.business_partner), joinedload(Contract.business_entity))
        .all()
    )
    headers = [
        "contract_number", "title", "status", "type", "jurisdiction",
        "business_partner", "business_entity",
        "start_date", "first_end_date", "probable_end_date", "absolute_end_date",
        "notice_date", "signing_date", "payment_timing", "notes",
    ]
    rows = [{
        "contract_number": c.contract_number or f"#{c.id}",
        "title": c.title or "",
        "status": _enum(c.status),
        "type": _enum(c.contract_type),
        "jurisdiction": c.jurisdiction or "",
        "business_partner": c.business_partner.company_name if c.business_partner else "",
        "business_entity": c.business_entity.name if c.business_entity else "",
        "start_date": _d(c.start_date),
        "first_end_date": _d(c.first_end_date),
        "probable_end_date": _d(c.probable_end_date),
        "absolute_end_date": _d(c.absolute_end_date),
        "notice_date": _d(c.notice_date),
        "signing_date": _d(c.signing_date),
        "payment_timing": _enum(c.payment_timing),
        "notes": (c.notes or "").replace("\n", " "),
    } for c in contracts]
    return _csv_response(rows, headers, "contracts.csv")


@router.get("/invoices")
def export_invoices(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    invoices = (
        db.query(Invoice)
        .join(Contract, Contract.id == Invoice.contract_id)
        .join(BusinessEntity, BusinessEntity.id == Contract.business_entity_id)
        .filter(BusinessEntity.org_id == org.id)
        .options(joinedload(Invoice.contract).joinedload(Contract.business_partner))
        .all()
    )
    headers = [
        "invoice_id", "contract_number", "business_partner",
        "condition_type", "amount", "currency", "status",
        "period_from", "period_to", "due_date", "paid_date",
    ]
    rows = []
    for inv in invoices:
        c = inv.contract
        rows.append({
            "invoice_id": f"INV-{inv.id:05d}",
            "contract_number": c.contract_number if c else "",
            "business_partner": c.business_partner.company_name if c and c.business_partner else "",
            "condition_type": _enum(inv.condition_type),
            "amount": inv.amount if inv.amount is not None else "",
            "currency": inv.currency or "",
            "status": inv.status or "",
            "period_from": _d(inv.period_from),
            "period_to": _d(inv.period_to),
            "due_date": _d(inv.due_date),
            "paid_date": _d(inv.paid_date),
        })
    return _csv_response(rows, headers, "invoices.csv")


@router.get("/conditions")
def export_conditions(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    conditions = (
        db.query(Condition)
        .join(Contract, Contract.id == Condition.contract_id)
        .join(BusinessEntity, BusinessEntity.id == Contract.business_entity_id)
        .filter(BusinessEntity.org_id == org.id)
        .options(joinedload(Condition.contract))
        .all()
    )
    headers = [
        "contract_number", "condition_type", "amount", "currency",
        "frequency", "valid_from", "valid_to",
    ]
    rows = []
    for cond in conditions:
        c = cond.contract
        rows.append({
            "contract_number": c.contract_number if c else "",
            "condition_type": _enum(cond.condition_type),
            "amount": cond.amount if cond.amount is not None else "",
            "currency": cond.currency or "",
            "frequency": _enum(cond.frequency),
            "valid_from": _d(cond.valid_from),
            "valid_to": _d(cond.valid_to),
        })
    return _csv_response(rows, headers, "conditions.csv")
