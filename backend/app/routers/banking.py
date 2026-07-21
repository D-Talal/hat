"""
Banking / Accounting Router — PropManager
GET/POST/PUT/DELETE /api/banking/accounts       → Bank accounts (comptes bancaires)
GET/POST            /api/banking/payments       → Payments received (encaissements)
PATCH /api/banking/payments/{id}/reconcile      → Toggle manual bank reconciliation
DELETE /api/banking/payments/{id}                → Delete a payment (reverts invoice to pending)
GET /api/banking/stats                          → Quick KPIs for the Payments page
"""
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.core.deps import get_current_user, get_current_org
from app.core.permissions import require_permission
from app.models.audit import AuditLog
from app.models.retail import Invoice, Contract, BusinessEntity
from app.models.finance import BankAccount, Payment, PaymentMethod

router = APIRouter()


def audit(db, user, action, resource, rid=None, details=None):
    db.add(AuditLog(user_id=user.id, user_email=user.email, action=action,
                     resource=resource, resource_id=rid, details=details,
                     org_id=getattr(user, "organization_id", None)))
    db.commit()


# ── Schemas ─────────────────────────────────────────────────────────────────

class BankAccountCreate(BaseModel):
    name: str
    bank_name: Optional[str] = None
    account_holder: Optional[str] = None
    iban: Optional[str] = None
    bic_swift: Optional[str] = None
    currency: str = "MAD"
    is_active: bool = True
    notes: Optional[str] = None


class BankAccountOut(BankAccountCreate):
    id: int
    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    invoice_id: int
    bank_account_id: Optional[int] = None
    amount: float
    currency: str = "MAD"
    payment_date: date
    method: PaymentMethod = PaymentMethod.virement
    reference: Optional[str] = None
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    id: int
    invoice_id: int
    bank_account_id: Optional[int]
    amount: float
    currency: str
    payment_date: date
    method: PaymentMethod
    reference: Optional[str]
    is_reconciled: bool
    reconciled_date: Optional[date]
    notes: Optional[str]
    class Config:
        from_attributes = True


class ReconcileIn(BaseModel):
    is_reconciled: bool = True


# ── Helpers ──────────────────────────────────────────────────────────────────

def _org_invoice_ids(db, org):
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    contract_ids = db.query(Contract.id).filter(Contract.business_entity_id.in_(be_ids)) if be_ids else []
    return db.query(Invoice.id).filter(Invoice.contract_id.in_(contract_ids))


# ── Bank Accounts ────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=List[BankAccountOut])
def list_bank_accounts(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    return db.query(BankAccount).filter(BankAccount.org_id == org.id).order_by(BankAccount.id.desc()).all()


@router.post("/accounts", response_model=BankAccountOut)
def create_bank_account(data: BankAccountCreate, db: Session = Depends(get_db),
                         u=Depends(require_permission("create")), org=Depends(get_current_org)):
    obj = BankAccount(org_id=org.id, **data.dict())
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_bank_accounts", obj.id)
    return obj


@router.put("/accounts/{id}", response_model=BankAccountOut)
def update_bank_account(id: int, data: BankAccountCreate, db: Session = Depends(get_db),
                         u=Depends(require_permission("update")), org=Depends(get_current_org)):
    obj = db.query(BankAccount).filter(BankAccount.id == id, BankAccount.org_id == org.id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_bank_accounts", obj.id)
    return obj


@router.delete("/accounts/{id}")
def delete_bank_account(id: int, db: Session = Depends(get_db),
                         u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    obj = db.query(BankAccount).filter(BankAccount.id == id, BankAccount.org_id == org.id).first()
    if not obj: raise HTTPException(404, "Not found")
    if db.query(Payment).filter(Payment.bank_account_id == id).first():
        raise HTTPException(400, "Ce compte a des paiements liés — impossible de le supprimer.")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_bank_accounts", id)
    return {"ok": True}


# ── Payments (Encaissements) ─────────────────────────────────────────────────

@router.get("/payments", response_model=List[PaymentOut])
def list_payments(invoice_id: Optional[int] = None, bank_account_id: Optional[int] = None,
                   reconciled: Optional[bool] = None,
                   db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    q = db.query(Payment).filter(Payment.invoice_id.in_(_org_invoice_ids(db, org)))
    if invoice_id: q = q.filter(Payment.invoice_id == invoice_id)
    if bank_account_id: q = q.filter(Payment.bank_account_id == bank_account_id)
    if reconciled is not None: q = q.filter(Payment.is_reconciled == reconciled)
    return q.order_by(Payment.payment_date.desc(), Payment.id.desc()).all()


@router.post("/payments", response_model=PaymentOut)
def create_payment(data: PaymentCreate, db: Session = Depends(get_db),
                    u=Depends(require_permission("create")), org=Depends(get_current_org)):
    inv = db.query(Invoice).filter(Invoice.id == data.invoice_id,
                                    Invoice.id.in_(_org_invoice_ids(db, org))).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if data.bank_account_id:
        ba = db.query(BankAccount).filter(BankAccount.id == data.bank_account_id, BankAccount.org_id == org.id).first()
        if not ba:
            raise HTTPException(404, "Bank account not found")

    obj = Payment(**data.dict())
    db.add(obj)

    # Recording a payment settles the invoice (simple 1-payment-per-invoice demo flow).
    inv.status = "paid"
    inv.paid_date = data.payment_date

    db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_payments", obj.id, f"invoice_id={inv.id} amount={data.amount}")
    return obj


@router.patch("/payments/{id}/reconcile", response_model=PaymentOut)
def reconcile_payment(id: int, data: ReconcileIn, db: Session = Depends(get_db),
                       u=Depends(require_permission("update")), org=Depends(get_current_org)):
    obj = db.query(Payment).filter(Payment.id == id, Payment.invoice_id.in_(_org_invoice_ids(db, org))).first()
    if not obj: raise HTTPException(404, "Not found")
    obj.is_reconciled = data.is_reconciled
    obj.reconciled_date = date.today() if data.is_reconciled else None
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_payments", obj.id, f"reconciled={data.is_reconciled}")
    return obj


@router.delete("/payments/{id}")
def delete_payment(id: int, db: Session = Depends(get_db),
                    u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    obj = db.query(Payment).filter(Payment.id == id, Payment.invoice_id.in_(_org_invoice_ids(db, org))).first()
    if not obj: raise HTTPException(404, "Not found")
    inv = db.query(Invoice).filter(Invoice.id == obj.invoice_id).first()
    if inv and inv.status == "paid":
        inv.status = "pending"
        inv.paid_date = None
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_payments", id)
    return {"ok": True}


# ── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def banking_stats(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    q = db.query(Payment).filter(Payment.invoice_id.in_(_org_invoice_ids(db, org)))
    payments = q.all()
    total_received = sum(float(p.amount or 0) for p in payments)
    total_reconciled = sum(float(p.amount or 0) for p in payments if p.is_reconciled)
    return {
        "total_payments": len(payments),
        "total_received": total_received,
        "total_reconciled": total_reconciled,
        "total_unreconciled": total_received - total_reconciled,
        "bank_accounts_count": db.query(BankAccount).filter(BankAccount.org_id == org.id).count(),
    }
