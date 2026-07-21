"""
Finance / Banking models — PropManager
BankAccount: bank accounts owned by the organization (used to receive rent payments).
Payment:     an "encaissement" (money received) applied against an invoice, optionally
             linked to a bank account, with a manual reconciliation flag.
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Numeric, Boolean, Date, DateTime, Text, ForeignKey, Enum
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class PaymentMethod(str, enum.Enum):
    virement = "virement"          # bank transfer
    cheque = "cheque"
    especes = "especes"            # cash
    carte = "carte"                # card
    prelevement = "prelevement"    # direct debit


class BankAccount(Base):
    __tablename__ = "re_bank_accounts"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)           # e.g. "Compte principal MAD"
    bank_name = Column(String(255))
    account_holder = Column(String(255))
    iban = Column(String(50))
    bic_swift = Column(String(20))
    currency = Column(String(3), default="MAD")
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    payments = relationship("Payment", back_populates="bank_account")


class Payment(Base):
    __tablename__ = "re_payments"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("re_invoices.id"), nullable=False, index=True)
    bank_account_id = Column(Integer, ForeignKey("re_bank_accounts.id"), nullable=True)
    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(3), default="MAD")
    payment_date = Column(Date, nullable=False)
    method = Column(Enum(PaymentMethod), default=PaymentMethod.virement)
    reference = Column(String(120))
    is_reconciled = Column(Boolean, default=False)
    reconciled_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bank_account = relationship("BankAccount", back_populates="payments")
    invoice = relationship("Invoice")
