"""
PropManager Posting Engine — SAP RE-FX RERAPP-inspired.
Modules: rent, IPC, sales-based, SCS, vacancy, deposit, IFRS16.
"""
import math
from datetime import date, timedelta, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.retail import (
    Contract, ContractObject, Condition, Space, SpaceStatus,
    SalesRule, SalesDeclaration, ParticipationGroup, ParticipationGroupMember,
    SettlementUnit, CostCollector, DepositContract, VacancyPosting,
    ContractStatus, ConditionType,
)
from app.models.posting import (
    PostingRun, PostingEntry, FxRate, IpcHistory,
    Ifrs16Schedule, Ifrs16ScheduleLine,
    PostingRunStatus, PostingEntryType,
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def dec(v) -> Decimal:
    if v is None: return Decimal("0")
    return Decimal(str(v)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)

def days_in_period(d_from: date, d_to: date) -> int:
    return (d_to - d_from).days + 1

def get_fx_rate(db: Session, from_cur: str, to_cur: str, on_date: date) -> float:
    if from_cur == to_cur: return 1.0
    r = (db.query(FxRate)
           .filter(FxRate.from_currency == from_cur, FxRate.to_currency == to_cur,
                   FxRate.valid_date <= on_date)
           .order_by(FxRate.valid_date.desc()).first())
    return r.rate if r else 1.0

def get_active_conditions(db: Session, contract_id: int, d_from: date, d_to: date):
    return db.query(Condition).filter(
        Condition.contract_id == contract_id,
        Condition.valid_from <= d_to,
        or_(Condition.valid_to.is_(None), Condition.valid_to >= d_from)
    ).all()

def period_amount(annual: Decimal, d_from: date, d_to: date, method: str, freq: str) -> Decimal:
    """Pro-rated amount for a period given annual amount."""
    freq_div = {"monthly": 12, "quarterly": 4, "semi_annual": 2, "annual": 1}
    n = freq_div.get(freq, 12)
    base = annual / dec(n)
    # Check full month
    m_start = d_from.replace(day=1)
    next_m = (m_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    m_end = next_m - timedelta(days=1)
    if d_from == m_start and d_to == m_end:
        return base
    # Pro-rata
    if method == "30E_360":
        days = (min(d_to.day, 30) - min(d_from.day - 1, 30))
        months = (d_to.year - d_from.year) * 12 + (d_to.month - d_from.month)
        factor = dec(months * 30 + days) / dec(360) * dec(12)
    else:
        factor = dec(days_in_period(d_from, d_to)) / dec(365) * dec(12)
    return (annual * factor / dec(n)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def make_entry(run, etype, amount, currency, d_from, d_to, desc, db,
               contract_id=None, condition_id=None, space_id=None, catchup=False):
    fx = get_fx_rate(db, currency, "USD", d_to)
    e = PostingEntry(
        posting_run_id=run.id, contract_id=contract_id, condition_id=condition_id,
        space_id=space_id, entry_type=etype,
        period_from=d_from, period_to=d_to, amount=amount, currency=currency,
        amount_base=amount * dec(fx), fx_rate=fx,
        description=desc, is_catchup=catchup, posted=not run.dry_run,
    )
    db.add(e)
    return e

def next_month(d: date) -> date:
    if d.month == 12: return d.replace(year=d.year+1, month=1)
    return d.replace(month=d.month+1)


# ── 1. RENT ──────────────────────────────────────────────────────────────────

RENT_TYPE_MAP = {
    ConditionType.base_rent:       PostingEntryType.base_rent,
    ConditionType.service_charge:  PostingEntryType.service_charge,
    ConditionType.advance_payment: PostingEntryType.advance_payment,
    ConditionType.flat_rate:       PostingEntryType.flat_rate,
    ConditionType.rent_free:       PostingEntryType.rent_free,
    ConditionType.abatement:       PostingEntryType.abatement,
}
NEGATIVE_TYPES = {ConditionType.rent_free, ConditionType.abatement}

def run_rent(db, run, d_from, d_to):
    entries = []
    contracts = db.query(Contract).filter(Contract.status == ContractStatus.released).all()
    for c in contracts:
        eff_from = max(d_from, c.start_date)
        eff_to   = min(d_to, c.absolute_end_date) if c.absolute_end_date else d_to
        if eff_from > eff_to: continue
        method = c.day_count_method or "act_365"
        for cond in get_active_conditions(db, c.id, eff_from, eff_to):
            if cond.condition_type not in RENT_TYPE_MAP: continue
            if not cond.amount: continue
            freq = cond.frequency or "monthly"
            freq_mult = {"monthly": 12, "quarterly": 4, "semi_annual": 2, "annual": 1}
            annual = dec(cond.amount) * dec(freq_mult.get(freq, 12))
            cf = max(eff_from, cond.valid_from)
            ct = min(eff_to, cond.valid_to) if cond.valid_to else eff_to
            amt = period_amount(annual, cf, ct, method, freq)
            if cond.condition_type in NEGATIVE_TYPES: amt = -amt
            entries.append(make_entry(run, RENT_TYPE_MAP[cond.condition_type], amt,
                cond.currency or "USD", cf, ct,
                f"{cond.condition_type.value} — {c.contract_number}", db, c.id, cond.id))
    return entries


# ── 2. IPC ───────────────────────────────────────────────────────────────────

def apply_ipc(db: Session, contract_id: int, new_index: float, applied_date: date) -> IpcHistory:
    """Apply IPC revision to all linked conditions simultaneously."""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    after_ace = contract.absolute_end_date and applied_date > contract.absolute_end_date
    conditions = db.query(Condition).filter(
        Condition.contract_id == contract_id,
        Condition.ipc_enabled == True,
        or_(Condition.valid_to.is_(None), Condition.valid_to >= applied_date)
    ).all()
    updated_ids = []
    old_index = None
    for cond in conditions:
        if after_ace and cond.condition_code and cond.condition_code.endswith("50"):
            continue
        base = cond.ipc_base_index or 100.0
        if old_index is None: old_index = base
        new_amt = (dec(cond.amount) * dec(new_index / base)).quantize(Decimal("0.01"))
        cond.valid_to = applied_date - timedelta(days=1)
        from copy import copy as cp
        nc = Condition(
            contract_id=cond.contract_id, condition_type=cond.condition_type,
            condition_code=cond.condition_code, valid_from=applied_date, valid_to=None,
            amount=new_amt, currency=cond.currency, frequency=cond.frequency,
            payment_timing=cond.payment_timing, ipc_enabled=True,
            ipc_base_index=new_index, ipc_reference_date=applied_date,
            is_flat_rate=cond.is_flat_rate, markup_rate=cond.markup_rate,
        )
        db.add(nc)
        updated_ids.append(cond.id)
    if not old_index: old_index = 100.0
    h = IpcHistory(contract_id=contract_id, applied_date=applied_date,
                   old_index=old_index, new_index=new_index,
                   revision_pct=((new_index/old_index)-1)*100,
                   conditions_updated=updated_ids)
    db.add(h)
    db.commit()
    return h


# ── 3. SALES-BASED RENT ──────────────────────────────────────────────────────

def calc_sales_rent(rule: SalesRule, ca: Decimal) -> Decimal:
    if rule.calc_mode == "linear":
        rent = ca * dec(rule.rate_pct or 0)
    else:
        brackets = sorted(rule.brackets, key=lambda b: float(b.from_amount))
        rent, remaining = dec(0), ca
        for b in brackets:
            if remaining <= 0: break
            taxable = min(remaining, dec(b.to_amount) - dec(b.from_amount)) if b.to_amount else remaining
            rent += taxable * dec(b.rate_pct)
            remaining -= taxable
    if rule.min_rent and rent < dec(rule.min_rent): rent = dec(rule.min_rent)
    if rule.max_rent and rent > dec(rule.max_rent): rent = dec(rule.max_rent)
    return rent.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def run_sales_based_rent(db, run, d_from, d_to):
    entries = []
    for decl in db.query(SalesDeclaration).filter(
        SalesDeclaration.posted == False,
        SalesDeclaration.period_from >= d_from,
        SalesDeclaration.period_to <= d_to,
    ).all():
        if not decl.sales_rule: continue
        rent = calc_sales_rent(decl.sales_rule, dec(decl.declared_amount))
        decl.calculated_rent = rent
        if not run.dry_run:
            decl.posted = True
        cur = decl.contract.conditions[0].currency if decl.contract and decl.contract.conditions else "USD"
        entries.append(make_entry(run, PostingEntryType.sales_based_rent, rent, cur,
            decl.period_from, decl.period_to,
            f"Sales rent — {decl.contract.contract_number} — CA:{decl.declared_amount}",
            db, decl.contract_id))
    return entries


# ── 4. SCS SETTLEMENT ────────────────────────────────────────────────────────

def run_scs_settlement(db, run, d_from, d_to):
    entries = []
    for pg in db.query(ParticipationGroup).all():
        for su in pg.settlement_units:
            for cc in su.cost_collectors:
                if cc.status != "released": continue
                net_pool = dec(cc.net_pool or 0)
                if net_pool == 0: continue
                members = [m for m in pg.members if not m.excluded]
                if not members: continue
                # Surface quota-part
                surfaces = {}
                total_surface = dec(0)
                for m in members:
                    co = m.contract_object
                    if not co: continue
                    area = dec(0)
                    for ros in ([co.space] if co.space else []):
                        latest = sorted([ms for ms in ros.space.measurements if not ms.valid_to],
                                        key=lambda ms: ms.valid_from, reverse=True)
                        if latest: area += dec(latest[0].area_sqm)
                    surfaces[m.id] = area
                    total_surface += area
                if total_surface == 0: continue
                # Raw shares
                raw = {}
                for m in members:
                    co = m.contract_object
                    if not co: continue
                    flat = db.query(Condition).filter(
                        Condition.contract_id == co.contract_id,
                        Condition.condition_type == ConditionType.flat_rate,
                        Condition.is_flat_rate == True,
                        or_(Condition.valid_to.is_(None), Condition.valid_to >= d_to)
                    ).first()
                    if flat and flat.amount:
                        raw[m.id] = dec(flat.amount)
                    else:
                        raw[m.id] = net_pool * (surfaces.get(m.id, dec(0)) / total_surface)
                # Apply caps + redistribute excess
                final, excess = {}, dec(0)
                uncapped = []
                for m in members:
                    s = raw.get(m.id, dec(0))
                    if m.max_cost and s > dec(m.max_cost):
                        excess += s - dec(m.max_cost)
                        final[m.id] = dec(m.max_cost)
                    else:
                        final[m.id] = s
                        uncapped.append(m)
                if excess > 0 and uncapped:
                    unc_total = sum(final.get(m.id, dec(0)) for m in uncapped)
                    for m in uncapped:
                        if unc_total > 0:
                            final[m.id] += excess * (final.get(m.id, dec(0)) / unc_total)
                # Post entries
                for m in members:
                    co = m.contract_object
                    if not co: continue
                    charge = final.get(m.id, dec(0)).quantize(Decimal("0.01"))
                    if charge > 0:
                        entries.append(make_entry(run, PostingEntryType.scs_settlement, charge,
                            "USD", d_from, d_to,
                            f"SCS {pg.code} {cc.charge_category} FY{cc.fiscal_year}",
                            db, co.contract_id, space_id=co.space_id))
                    markup = (charge * dec(m.markup_rate or 0)).quantize(Decimal("0.01"))
                    if markup > 0:
                        entries.append(make_entry(run, PostingEntryType.markup_fee, markup,
                            "USD", d_from, d_to,
                            f"Markup {int((m.markup_rate or 0)*100)}% — {pg.code}",
                            db, co.contract_id))
    return entries


# ── 5. VACANCY ───────────────────────────────────────────────────────────────

def run_vacancy(db, run, d_from, d_to):
    entries = []
    for ro in db.query(Space).filter(Space.status.in_([SpaceStatus.vacant, SpaceStatus.available])).all():
        active = db.query(ContractObject).filter(
            ContractObject.space_id == ro.id,
            ContractObject.valid_from <= d_to,
            or_(ContractObject.valid_to.is_(None), ContractObject.valid_to >= d_from)
        ).first()
        if active: continue
        vp = (db.query(VacancyPosting)
                .filter(VacancyPosting.space_id == ro.id, VacancyPosting.reversed == False)
                .order_by(VacancyPosting.period_from.desc()).first())
        if not vp or not vp.market_rent: continue
        surface = dec(0)
        for ros in ro.spaces:
            latest = sorted([m for m in ros.space.measurements if not m.valid_to],
                            key=lambda m: m.valid_from, reverse=True)
            if latest: surface += dec(latest[0].area_sqm)
        if surface == 0: continue
        monthly = (surface * dec(vp.market_rent) / dec(12)).quantize(Decimal("0.01"))
        entries.append(make_entry(run, PostingEntryType.vacancy_cost, monthly,
            "USD", d_from, d_to,
            f"Vacancy {ro.code} {float(surface):.1f}m² @ {vp.market_rent}/m²/yr",
            db, space_id=ro.id))
        if not run.dry_run: vp.posted = True
    return entries


# ── 6. SECURITY DEPOSIT ──────────────────────────────────────────────────────

def run_security_deposits(db, run, d_from, d_to):
    entries = []
    for dep in db.query(DepositContract).filter(
        DepositContract.status == "active",
        or_(DepositContract.end_date.is_(None), DepositContract.end_date >= d_from)
    ).all():
        if dep.calc_method != "auto" or not dep.months_of_rent: continue
        base_cond = db.query(Condition).filter(
            Condition.contract_id == dep.main_contract_id,
            Condition.condition_type == ConditionType.base_rent,
            or_(Condition.valid_to.is_(None), Condition.valid_to >= d_from)
        ).order_by(Condition.valid_from.desc()).first()
        if not base_cond or not base_cond.amount: continue
        expected = dec(base_cond.amount) * dec(dep.months_of_rent)
        diff = expected - dec(dep.amount or 0)
        if abs(diff) < dec("0.01"): continue
        if not run.dry_run: dep.amount = expected
        entries.append(make_entry(run, PostingEntryType.deposit_charge, diff,
            base_cond.currency or "USD", d_from, d_to,
            f"Deposit adj — {dep.deposit_number} ({'inc' if diff>0 else 'dec'})",
            db, dep.main_contract_id))
    return entries


# ── 7. IFRS 16 ───────────────────────────────────────────────────────────────

def build_ifrs16_schedule(db: Session, contract_id: int, discount_rate: float,
                           initial_direct_costs: float = 0) -> Ifrs16Schedule:
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract: raise ValueError(f"Contract {contract_id} not found")
    end_date = contract.probable_end_date or contract.absolute_end_date
    if not end_date: raise ValueError("Contract needs end date for IFRS16")
    conditions = db.query(Condition).filter(
        Condition.contract_id == contract_id,
        Condition.condition_type == ConditionType.base_rent,
        Condition.valid_from <= end_date,
        or_(Condition.valid_to.is_(None), Condition.valid_to >= contract.start_date)
    ).order_by(Condition.valid_from).all()
    if not conditions: raise ValueError("No base rent conditions for IFRS16")
    currency = conditions[0].currency or "USD"
    freq_mult = {"monthly": 12, "quarterly": 4, "semi_annual": 2, "annual": 1}
    # Build monthly payments
    payments = []
    cur = contract.start_date.replace(day=1)
    while cur <= end_date:
        app = next((c for c in conditions
                    if c.valid_from <= cur and (not c.valid_to or c.valid_to >= cur)), None)
        if app and app.amount:
            annual = dec(app.amount) * dec(freq_mult.get(app.frequency or "monthly", 12))
            payments.append((cur, annual / dec(12)))
        else:
            payments.append((cur, dec(0)))
        cur = next_month(cur)
    # PV calculation
    monthly_rate = discount_rate / 12
    pv = sum(p * dec(1 / ((1 + monthly_rate) ** i)) for i, (_, p) in enumerate(payments))
    pv = pv.quantize(Decimal("0.01"))
    rou = pv + dec(initial_direct_costs)
    uli = len(payments)
    sched = Ifrs16Schedule(
        contract_id=contract_id, discount_rate=discount_rate,
        initial_liability=pv, initial_rou=rou,
        initial_direct_costs=dec(initial_direct_costs),
        recognition_date=contract.start_date, currency=currency,
        liability_balance=pv, rou_balance=rou, accumulated_amort=dec(0),
        rou_useful_life_months=uli, amort_method="straight_line",
    )
    db.add(sched); db.flush()
    monthly_amort = (rou / dec(uli)).quantize(Decimal("0.01"))
    lib_bal, rou_bal = pv, rou
    for _, (pd, payment) in enumerate(payments):
        interest = (lib_bal * dec(monthly_rate)).quantize(Decimal("0.01"))
        repay    = (payment - interest).quantize(Decimal("0.01"))
        lib_close = max(lib_bal - repay, dec(0))
        rou_close = max(rou_bal - monthly_amort, dec(0))
        db.add(Ifrs16ScheduleLine(
            schedule_id=sched.id, period_date=pd,
            lease_payment=payment, interest_charge=interest,
            liability_repay=repay, liability_close=lib_close,
            rou_amort=monthly_amort, rou_close=rou_close,
        ))
        lib_bal, rou_bal = lib_close, rou_close
    db.commit()
    return sched

def run_ifrs16(db, run, d_from, d_to):
    entries = []
    for sched in db.query(Ifrs16Schedule).all():
        lines = db.query(Ifrs16ScheduleLine).filter(
            Ifrs16ScheduleLine.schedule_id == sched.id,
            Ifrs16ScheduleLine.period_date >= d_from.replace(day=1),
            Ifrs16ScheduleLine.period_date <= d_to,
            Ifrs16ScheduleLine.posted == False,
        ).order_by(Ifrs16ScheduleLine.period_date).all()
        for line in lines:
            if line.interest_charge and dec(line.interest_charge) > 0:
                entries.append(make_entry(run, PostingEntryType.ifrs16_interest,
                    dec(line.interest_charge), sched.currency,
                    line.period_date, line.period_date,
                    f"IFRS16 Interest — Contract {sched.contract_id}",
                    db, sched.contract_id))
            if line.rou_amort and dec(line.rou_amort) > 0:
                entries.append(make_entry(run, PostingEntryType.ifrs16_amort,
                    dec(line.rou_amort), sched.currency,
                    line.period_date, line.period_date,
                    f"IFRS16 RoU Amort — Contract {sched.contract_id}",
                    db, sched.contract_id))
            if not run.dry_run:
                line.posted = True
                sched.liability_balance = line.liability_close
                sched.rou_balance = line.rou_close
                sched.accumulated_amort = dec(sched.accumulated_amort or 0) + dec(line.rou_amort or 0)
                sched.last_posted_date = line.period_date
    return entries


# ── MASTER RUN ───────────────────────────────────────────────────────────────

def execute_posting_run(db: Session, period_from: date, period_to: date,
                         module: str = "all", dry_run: bool = False,
                         triggered_by: int = None) -> PostingRun:
    run = PostingRun(period_from=period_from, period_to=period_to,
                     module=module, status=PostingRunStatus.running,
                     dry_run=dry_run, triggered_by=triggered_by)
    db.add(run); db.flush()

    all_entries, errors, summary = [], [], {}

    def safe(name, fn):
        try:
            r = fn(db, run, period_from, period_to)
            summary[name] = {"count": len(r), "total": float(sum(dec(e.amount) for e in r))}
            return r
        except Exception as ex:
            errors.append(f"{name}: {str(ex)}")
            summary[name] = {"count": 0, "total": 0, "error": str(ex)}
            return []

    if module in ("all", "rent"):        all_entries += safe("rent", run_rent)
    if module in ("all", "sales"):       all_entries += safe("sales", run_sales_based_rent)
    if module in ("all", "scs"):         all_entries += safe("scs", run_scs_settlement)
    if module in ("all", "vacancy"):     all_entries += safe("vacancy", run_vacancy)
    if module in ("all", "deposit"):     all_entries += safe("deposit", run_security_deposits)
    if module in ("all", "ifrs16"):      all_entries += safe("ifrs16", run_ifrs16)

    run.status        = PostingRunStatus.failed if (errors and not all_entries) else PostingRunStatus.completed
    run.total_entries = len(all_entries)
    run.total_amount  = float(sum(dec(e.amount) for e in all_entries))
    run.error_count   = len(errors)
    run.errors        = errors
    run.summary       = summary
    run.completed_at  = datetime.utcnow()

    if not dry_run:
        db.commit()
    else:
        # Dry run: rollback all but keep the run record
        db.rollback()
        run2 = PostingRun(period_from=period_from, period_to=period_to,
                          module=module, status=run.status, dry_run=True,
                          triggered_by=triggered_by, total_entries=run.total_entries,
                          total_amount=run.total_amount, error_count=run.error_count,
                          errors=errors, summary=summary, completed_at=datetime.utcnow())
        db.add(run2); db.commit()
        return run2

    return run
