"""
Alert Engine — PropManager
Queries the DB for alert conditions and sends emails.
Called by the APScheduler jobs registered in main.py.
"""

import logging
from datetime import date, timedelta
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.models.retail import (
    Invoice, Contract, ContractStatus,
    MaintenanceRequest, MaintenanceStatus,
    BusinessPartner, BusinessEntity,
)
from app.services.email_service import (
    send_invoice_overdue,
    send_contract_expiring,
    send_maintenance_overdue,
    send_monthly_summary,
)

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────
MAINTENANCE_OVERDUE_DAYS = 7          # alert if open for more than X days
CONTRACT_EXPIRY_THRESHOLDS = [90, 60, 30]  # alert at these days remaining
MONTHLY_SUMMARY_DAY = 1              # send on the 1st of each month


def _get_org_admins(db: Session, org_id: int) -> list[str]:
    """Return emails of active admin + manager users for an org."""
    users = db.query(User).filter(
        User.organization_id == org_id,
        User.is_active == True,
        User.role.in_([UserRole.admin, UserRole.manager]),
    ).all()
    return [u.email for u in users if u.email]


def _get_all_active_orgs(db: Session) -> list[Organization]:
    return db.query(Organization).filter(
        Organization.is_active != False
    ).all()


# ── Job 1: Overdue invoices (daily) ───────────────────────────────────────────

def check_overdue_invoices():
    logger.info("[ALERTS] Running overdue invoice check")
    db: Session = SessionLocal()
    today = date.today()
    sent = 0
    try:
        orgs = _get_all_active_orgs(db)
        for org in orgs:
            admins = _get_org_admins(db, org.id)
            if not admins:
                continue

            # Overdue invoices: pending + due_date < today
            overdue = (
                db.query(Invoice)
                .join(Contract)
                .join(BusinessEntity, BusinessEntity.id == Contract.business_entity_id)
                .filter(
                    BusinessEntity.org_id == org.id,
                    Invoice.status == "pending",
                    Invoice.due_date < today,
                )
                .all()
            )

            for inv in overdue:
                days_overdue = (today - inv.due_date).days
                # Only alert on specific days to avoid spam: 1, 3, 7, 14, 30...
                if days_overdue not in {1, 3, 7, 14, 30}:
                    continue

                contract = inv.contract
                bp = db.query(BusinessPartner).filter(
                    BusinessPartner.id == contract.business_partner_id
                ).first()
                tenant_name = bp.company_name if bp else f"Contract #{contract.id}"

                for email in admins:
                    ok = send_invoice_overdue(
                        to=email,
                        org_name=org.name,
                        tenant_name=tenant_name,
                        contract_number=contract.contract_number or f"#{contract.id}",
                        invoice_amount=float(inv.amount or 0),
                        currency=inv.currency or "USD",
                        due_date=inv.due_date,
                        days_overdue=days_overdue,
                        invoice_id=inv.id,
                    )
                    if ok:
                        sent += 1
    except Exception as e:
        logger.error(f"[ALERTS] Overdue invoice check failed: {e}", exc_info=True)
    finally:
        db.close()
    logger.info(f"[ALERTS] Overdue invoice check done — {sent} emails sent")


# ── Job 2: Expiring contracts (daily) ────────────────────────────────────────

def check_expiring_contracts():
    logger.info("[ALERTS] Running expiring contracts check")
    db: Session = SessionLocal()
    today = date.today()
    sent = 0
    try:
        orgs = _get_all_active_orgs(db)
        for org in orgs:
            admins = _get_org_admins(db, org.id)
            if not admins:
                continue

            be_ids = [
                r[0] for r in db.query(BusinessEntity.id)
                .filter(BusinessEntity.org_id == org.id).all()
            ]
            if not be_ids:
                continue

            for threshold in CONTRACT_EXPIRY_THRESHOLDS:
                target_date = today + timedelta(days=threshold)
                # Only alert on the exact threshold day
                contracts = (
                    db.query(Contract)
                    .filter(
                        Contract.business_entity_id.in_(be_ids),
                        Contract.status == ContractStatus.released,
                        Contract.absolute_end_date == target_date,
                    )
                    .all()
                )
                for contract in contracts:
                    bp = db.query(BusinessPartner).filter(
                        BusinessPartner.id == contract.business_partner_id
                    ).first()
                    tenant_name = bp.company_name if bp else f"Contract #{contract.id}"

                    for email in admins:
                        ok = send_contract_expiring(
                            to=email,
                            org_name=org.name,
                            tenant_name=tenant_name,
                            contract_number=contract.contract_number or f"#{contract.id}",
                            end_date=contract.absolute_end_date,
                            days_remaining=threshold,
                        )
                        if ok:
                            sent += 1
    except Exception as e:
        logger.error(f"[ALERTS] Expiring contracts check failed: {e}", exc_info=True)
    finally:
        db.close()
    logger.info(f"[ALERTS] Expiring contracts check done — {sent} emails sent")


# ── Job 3: Stale maintenance requests (daily) ─────────────────────────────────

def check_stale_maintenance():
    logger.info("[ALERTS] Running stale maintenance check")
    db: Session = SessionLocal()
    today = date.today()
    cutoff = today - timedelta(days=MAINTENANCE_OVERDUE_DAYS)
    sent = 0
    try:
        orgs = _get_all_active_orgs(db)
        for org in orgs:
            admins = _get_org_admins(db, org.id)
            if not admins:
                continue

            be_ids = [
                r[0] for r in db.query(BusinessEntity.id)
                .filter(BusinessEntity.org_id == org.id).all()
            ]
            if not be_ids:
                continue

            # Maintenance open for more than MAINTENANCE_OVERDUE_DAYS
            stale = (
                db.query(MaintenanceRequest)
                .join(Contract, Contract.id == MaintenanceRequest.contract_id, isouter=True)
                .filter(
                    MaintenanceRequest.status != MaintenanceStatus.closed,
                    MaintenanceRequest.created_at <= cutoff,
                    # Scope to org via contract → business_entity
                    Contract.business_entity_id.in_(be_ids),
                )
                .all()
            )

            # Only alert on specific intervals to avoid daily spam
            for req in stale:
                days_open = (today - req.created_at.date()).days
                if days_open not in {7, 14, 30, 60}:
                    continue

                unit_name = None
                if req.rental_object:
                    unit_name = req.rental_object.code

                for email in admins:
                    ok = send_maintenance_overdue(
                        to=email,
                        org_name=org.name,
                        title=req.title,
                        priority=req.priority or "medium",
                        days_open=days_open,
                        reported_by=req.reported_by,
                        unit_name=unit_name,
                    )
                    if ok:
                        sent += 1
    except Exception as e:
        logger.error(f"[ALERTS] Stale maintenance check failed: {e}", exc_info=True)
    finally:
        db.close()
    logger.info(f"[ALERTS] Stale maintenance check done — {sent} emails sent")


# ── Job 4: Monthly summary (1st of month) ────────────────────────────────────

def send_monthly_summaries():
    today = date.today()
    if today.day != MONTHLY_SUMMARY_DAY:
        return
    logger.info("[ALERTS] Running monthly summary")
    db: Session = SessionLocal()
    sent = 0
    try:
        # Current month range
        first_of_month = today.replace(day=1)
        if first_of_month.month == 1:
            prev_month_start = first_of_month.replace(year=first_of_month.year - 1, month=12)
        else:
            prev_month_start = first_of_month.replace(month=first_of_month.month - 1)
        month_label = prev_month_start.strftime("%B %Y")

        orgs = _get_all_active_orgs(db)
        for org in orgs:
            admins = _get_org_admins(db, org.id)
            if not admins:
                continue

            be_ids = [
                r[0] for r in db.query(BusinessEntity.id)
                .filter(BusinessEntity.org_id == org.id).all()
            ]
            if not be_ids:
                continue

            from sqlalchemy import func

            # Invoices last month
            inv_q = (
                db.query(
                    func.coalesce(func.sum(Invoice.amount), 0).label("total"),
                    func.coalesce(
                        func.sum(Invoice.amount).filter(Invoice.status == "paid"), 0
                    ).label("paid"),
                )
                .join(Contract)
                .filter(
                    Contract.business_entity_id.in_(be_ids),
                    Invoice.due_date >= prev_month_start,
                    Invoice.due_date < first_of_month,
                )
                .first()
            )
            total_invoiced = float(inv_q.total or 0)
            total_paid     = float(inv_q.paid or 0)

            # Overdue today
            overdue_q = (
                db.query(
                    func.count(Invoice.id).label("cnt"),
                    func.coalesce(func.sum(Invoice.amount), 0).label("amt"),
                )
                .join(Contract)
                .filter(
                    Contract.business_entity_id.in_(be_ids),
                    Invoice.status == "pending",
                    Invoice.due_date < today,
                )
                .first()
            )
            overdue_count  = int(overdue_q.cnt or 0)
            overdue_amount = float(overdue_q.amt or 0)

            # Contracts expiring in 90 days
            expiring = db.query(func.count(Contract.id)).filter(
                Contract.business_entity_id.in_(be_ids),
                Contract.status == ContractStatus.released,
                Contract.absolute_end_date <= today + timedelta(days=90),
                Contract.absolute_end_date >= today,
            ).scalar() or 0

            # Open maintenance
            open_maint = db.query(func.count(MaintenanceRequest.id)).join(
                Contract, Contract.id == MaintenanceRequest.contract_id, isouter=True
            ).filter(
                MaintenanceRequest.status != MaintenanceStatus.closed,
                Contract.business_entity_id.in_(be_ids),
            ).scalar() or 0

            for email in admins:
                ok = send_monthly_summary(
                    to=email,
                    org_name=org.name,
                    month_label=month_label,
                    total_invoiced=total_invoiced,
                    total_paid=total_paid,
                    overdue_count=overdue_count,
                    overdue_amount=overdue_amount,
                    expiring_contracts=expiring,
                    open_maintenance=open_maint,
                )
                if ok:
                    sent += 1
    except Exception as e:
        logger.error(f"[ALERTS] Monthly summary failed: {e}", exc_info=True)
    finally:
        db.close()
    logger.info(f"[ALERTS] Monthly summary done — {sent} emails sent")
