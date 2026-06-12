from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, Text,
    Enum, ForeignKey, Boolean, Numeric, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class ContractStatus(str, enum.Enum):
    draft = "draft"; released = "released"; terminated = "terminated"; expired = "expired"

class ContractType(str, enum.Enum):
    lease_out = "lease_out"; lease_in = "lease_in"

class ConditionType(str, enum.Enum):
    base_rent = "base_rent"; service_charge = "service_charge"; advance_payment = "advance_payment"
    flat_rate = "flat_rate"; sales_based = "sales_based"; markup_fee = "markup_fee"
    rent_free = "rent_free"; abatement = "abatement"

class ConditionFrequency(str, enum.Enum):
    monthly = "monthly"; quarterly = "quarterly"; semi_annual = "semi_annual"; annual = "annual"

class PaymentTiming(str, enum.Enum):
    in_advance = "in_advance"; in_arrears = "in_arrears"

class SpaceStatus(str, enum.Enum):
    available = "available"; occupied = "occupied"; maintenance = "maintenance"; vacant = "vacant"

class BPRole(str, enum.Enum):
    master_tenant = "master_tenant"; guarantor = "guarantor"; landlord = "landlord"
    vendor = "vendor"; contact_person = "contact_person"

class SalesCalcMode(str, enum.Enum):
    linear = "linear"; graded = "graded"

class MaintenanceStatus(str, enum.Enum):
    open = "open"; in_progress = "in_progress"; closed = "closed"


class CompanyCode(Base):
    __tablename__ = "re_company_codes"
    __table_args__ = {'extend_existing': True}
    id           = Column(Integer, primary_key=True, index=True)
    org_id       = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    code         = Column(String(20), nullable=False)
    name         = Column(String(255), nullable=False)
    currency     = Column(String(10), default="USD")
    country      = Column(String(100))
    state        = Column(String(100))
    description  = Column(String(500))
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    business_entities = relationship("BusinessEntity", back_populates="company_code")


class BusinessEntity(Base):
    __tablename__ = "re_business_entities"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    org_id           = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    company_code_id  = Column(Integer, ForeignKey("re_company_codes.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255))
    tax_id = Column(String(100))
    country = Column(String(100))
    state = Column(String(100))
    city = Column(String(100))
    continent = Column(String(100))
    address = Column(String(500))
    annual_revenue = Column(Numeric(18, 2), default=0)
    currency = Column(String(10), default="USD")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    company_code = relationship("CompanyCode", back_populates="business_entities")
    buildings = relationship("Building", back_populates="business_entity")


class Building(Base):
    __tablename__ = "re_buildings"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    business_entity_id = Column(Integer, ForeignKey("re_business_entities.id"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(String(500))
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    continent = Column(String(100))
    total_area_sqm = Column(Float)
    construction_year = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    business_entity = relationship("BusinessEntity", back_populates="buildings")
    floors = relationship("Floor", back_populates="building")


class Floor(Base):
    __tablename__ = "re_floors"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("re_buildings.id"), nullable=False)
    floor_number = Column(Integer, nullable=False)
    name = Column(String(100))
    area_sqm = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    building = relationship("Building", back_populates="floors")
    spaces = relationship("Space", back_populates="floor")


class Space(Base):
    __tablename__ = "re_spaces"
    __table_args__ = (
        UniqueConstraint("floor_id", "space_code", name="uq_space_code_per_floor"),
        {'extend_existing': True},
    )
    id = Column(Integer, primary_key=True, index=True)
    floor_id = Column(Integer, ForeignKey("re_floors.id"), nullable=False)
    space_code = Column(String(50), nullable=False)
    description = Column(String(255))
    status = Column(Enum(SpaceStatus), default=SpaceStatus.available)
    # Fields migrated from RentalObject
    usage_type  = Column(String(100))
    cost_center = Column(String(100))
    im_key      = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    floor = relationship("Floor", back_populates="spaces")
    measurements = relationship("SpaceMeasurement", back_populates="space")
    contract_objects = relationship("ContractObject", back_populates="space")
    vacancy_postings = relationship("VacancyPosting", back_populates="space")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="space")


class SpaceMeasurement(Base):
    __tablename__ = "re_space_measurements"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    space_id = Column(Integer, ForeignKey("re_spaces.id"), nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date)
    area_sqm = Column(Float, nullable=False)
    note = Column(String(255))
    space = relationship("Space", back_populates="measurements")


class BusinessPartner(Base):
    __tablename__ = "re_business_partners"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    bp_number = Column(String(50), unique=True)
    company_name = Column(String(255), nullable=False)
    trade_name = Column(String(255))
    contact_name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(String(500))
    continent = Column(String(100))
    country = Column(String(100))
    state = Column(String(100))
    city = Column(String(100))
    tax_id = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    roles = relationship("BusinessPartnerRole", back_populates="business_partner")
    contracts = relationship("Contract", back_populates="business_partner")
    deposit_contracts = relationship("DepositContract", back_populates="business_partner")


class BusinessPartnerRole(Base):
    __tablename__ = "re_bp_roles"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    business_partner_id = Column(Integer, ForeignKey("re_business_partners.id"), nullable=False)
    role = Column(Enum(BPRole), nullable=False)
    customer_account = Column(String(100))
    valid_from = Column(Date)
    valid_to = Column(Date)
    business_partner = relationship("BusinessPartner", back_populates="roles")


class Contract(Base):
    __tablename__ = "re_contracts"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    contract_number = Column(String(50), unique=True)
    title = Column(String(200))
    jurisdiction = Column(String(100))
    business_partner_id = Column(Integer, ForeignKey("re_business_partners.id"), nullable=False)
    business_entity_id = Column(Integer, ForeignKey("re_business_entities.id"), nullable=False)
    contract_type = Column(Enum(ContractType), default=ContractType.lease_out)
    status = Column(Enum(ContractStatus), default=ContractStatus.draft)
    start_date = Column(Date, nullable=False)
    first_end_date = Column(Date)
    probable_end_date = Column(Date)
    absolute_end_date = Column(Date)
    notice_date = Column(Date)
    signing_date = Column(Date)
    relevant_to_sales = Column(Boolean, default=False)
    is_multi_object = Column(Boolean, default=False)
    payment_timing = Column(Enum(PaymentTiming), default=PaymentTiming.in_advance)
    day_count_method = Column(String(20), default="act_365")
    pro_rata_enabled = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    business_partner = relationship("BusinessPartner", back_populates="contracts")
    business_entity = relationship("BusinessEntity")
    contract_objects = relationship("ContractObject", back_populates="contract")
    conditions = relationship("Condition", back_populates="contract")
    amendments = relationship("ContractAmendment", back_populates="contract", order_by="ContractAmendment.effective_date")
    date_slots = relationship("ContractDateSlot", back_populates="contract")
    sales_declarations = relationship("SalesDeclaration", back_populates="contract")
    invoices = relationship("Invoice", back_populates="contract")
    deposit_contracts = relationship("DepositContract", back_populates="main_contract")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="contract")


class ContractDateSlot(Base):
    __tablename__ = "re_contract_date_slots"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("re_contracts.id"), nullable=False)
    valid_from = Column(Date, nullable=False)
    start_date = Column(Date)
    probable_end_date = Column(Date)
    absolute_end_date = Column(Date)
    notice_date = Column(Date)
    reason = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    contract = relationship("Contract", back_populates="date_slots")


class ContractObject(Base):
    __tablename__ = "re_contract_objects"
    __table_args__ = (
        UniqueConstraint("contract_id", "space_id", "valid_from", name="uq_contract_space_period"),
        {'extend_existing': True},
    )
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("re_contracts.id"), nullable=False)
    space_id = Column(Integer, ForeignKey("re_spaces.id"), nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date)
    object_group = Column(String(100))
    contract = relationship("Contract", back_populates="contract_objects")
    space = relationship("Space", back_populates="contract_objects")


class Condition(Base):
    __tablename__ = "re_conditions"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("re_contracts.id"), nullable=False)
    condition_type = Column(Enum(ConditionType), nullable=False)
    condition_code = Column(String(20))
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date)
    amount = Column(Numeric(18, 2))
    currency = Column(String(10), default="USD")
    frequency = Column(Enum(ConditionFrequency), default=ConditionFrequency.monthly)
    payment_timing = Column(Enum(PaymentTiming), default=PaymentTiming.in_advance)
    ipc_enabled = Column(Boolean, default=False)
    ipc_base_index = Column(Float)
    ipc_reference_date = Column(Date)
    is_flat_rate = Column(Boolean, default=False)
    markup_rate = Column(Float)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    contract = relationship("Contract", back_populates="conditions")
    sales_rule = relationship("SalesRule", back_populates="condition", uselist=False)


class SalesRule(Base):
    __tablename__ = "re_sales_rules"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    condition_id = Column(Integer, ForeignKey("re_conditions.id"), nullable=False, unique=True)
    name = Column(String(255))
    calc_mode = Column(Enum(SalesCalcMode), default=SalesCalcMode.linear)
    rate_pct = Column(Float)
    min_rent = Column(Numeric(18, 2))
    max_rent = Column(Numeric(18, 2))
    sales_basis = Column(String(10), default="gross")
    reporting_rule = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    condition = relationship("Condition", back_populates="sales_rule")
    brackets = relationship("SalesRuleBracket", back_populates="sales_rule")
    declarations = relationship("SalesDeclaration", back_populates="sales_rule")


class SalesRuleBracket(Base):
    __tablename__ = "re_sales_rule_brackets"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    sales_rule_id = Column(Integer, ForeignKey("re_sales_rules.id"), nullable=False)
    from_amount = Column(Numeric(18, 2), nullable=False)
    to_amount = Column(Numeric(18, 2))
    rate_pct = Column(Float, nullable=False)
    sales_rule = relationship("SalesRule", back_populates="brackets")


class SalesDeclaration(Base):
    __tablename__ = "re_sales_declarations"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("re_contracts.id"), nullable=False)
    sales_rule_id = Column(Integer, ForeignKey("re_sales_rules.id"), nullable=False)
    space_id = Column(Integer, ForeignKey("re_spaces.id"), nullable=True)
    period_from = Column(Date, nullable=False)
    period_to = Column(Date, nullable=False)
    declared_amount = Column(Numeric(18, 2), nullable=False)
    sales_category = Column(String(100))
    calculated_rent = Column(Numeric(18, 2))
    posted = Column(Boolean, default=False)
    posted_at = Column(DateTime(timezone=True))
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    contract = relationship("Contract", back_populates="sales_declarations")
    sales_rule = relationship("SalesRule", back_populates="declarations")
    space = relationship("Space")


class ParticipationGroup(Base):
    __tablename__ = "re_participation_groups"
    __table_args__ = (
        UniqueConstraint("building_id", "code", name="uq_pg_code_per_building"),
        {'extend_existing': True},
    )
    id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("re_buildings.id"), nullable=False)
    code = Column(String(50), nullable=False)
    name = Column(String(255))
    charge_category = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    building = relationship("Building")
    members = relationship("ParticipationGroupMember", back_populates="participation_group")
    settlement_units = relationship("SettlementUnit", back_populates="participation_group")


class ParticipationGroupMember(Base):
    __tablename__ = "re_pg_members"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    participation_group_id = Column(Integer, ForeignKey("re_participation_groups.id"), nullable=False)
    contract_object_id = Column(Integer, ForeignKey("re_contract_objects.id"), nullable=False)
    excluded = Column(Boolean, default=False)
    max_cost = Column(Numeric(18, 2))
    markup_rate = Column(Float, default=0)
    valid_from = Column(Date)
    valid_to = Column(Date)
    participation_group = relationship("ParticipationGroup", back_populates="members")
    contract_object = relationship("ContractObject")


class SettlementUnit(Base):
    __tablename__ = "re_settlement_units"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    participation_group_id = Column(Integer, ForeignKey("re_participation_groups.id"), nullable=False)
    code = Column(String(50), nullable=False)
    name = Column(String(255))
    fiscal_year = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    participation_group = relationship("ParticipationGroup", back_populates="settlement_units")
    cost_collectors = relationship("CostCollector", back_populates="settlement_unit")


class CostCollector(Base):
    __tablename__ = "re_cost_collectors"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    settlement_unit_id = Column(Integer, ForeignKey("re_settlement_units.id"), nullable=False)
    charge_category = Column(String(100))
    description = Column(String(255))
    status = Column(String(20), default="released")
    total_costs = Column(Numeric(18, 2), default=0)
    ancillary_revenues = Column(Numeric(18, 2), default=0)
    net_pool = Column(Numeric(18, 2), default=0)
    fiscal_year = Column(Integer)
    settled_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    settlement_unit = relationship("SettlementUnit", back_populates="cost_collectors")


class DepositContract(Base):
    __tablename__ = "re_deposit_contracts"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    main_contract_id = Column(Integer, ForeignKey("re_contracts.id"), nullable=False)
    business_partner_id = Column(Integer, ForeignKey("re_business_partners.id"), nullable=False)
    deposit_number = Column(String(50), unique=True)
    calc_method = Column(String(20), default="fixed")
    months_of_rent = Column(Float)
    amount = Column(Numeric(18, 2))
    currency = Column(String(10), default="USD")
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String(20), default="active")
    refunded_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    main_contract = relationship("Contract", back_populates="deposit_contracts")
    business_partner = relationship("BusinessPartner", back_populates="deposit_contracts")


class VacancyPosting(Base):
    __tablename__ = "re_vacancy_postings"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    space_id = Column(Integer, ForeignKey("re_spaces.id"), nullable=False)
    period_from = Column(Date, nullable=False)
    period_to = Column(Date, nullable=False)
    market_rent = Column(Numeric(18, 2))
    cost_center = Column(String(100))
    posted = Column(Boolean, default=False)
    reversed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    space = relationship("Space", back_populates="vacancy_postings")


class Invoice(Base):
    __tablename__ = "re_invoices"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("re_contracts.id"), nullable=False)
    condition_type = Column(Enum(ConditionType))
    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(10), default="USD")
    due_date = Column(Date)
    paid_date = Column(Date)
    status = Column(String(50), default="pending")
    period_from = Column(Date)
    period_to = Column(Date)
    description = Column(Text)
    is_catch_up = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    contract = relationship("Contract", back_populates="invoices")


class MaintenanceRequest(Base):
    __tablename__ = "re_maintenance"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("re_contracts.id"), nullable=True)
    space_id = Column(Integer, ForeignKey("re_spaces.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    priority = Column(String(50), default="medium")
    status = Column(Enum(MaintenanceStatus), default=MaintenanceStatus.open)
    reported_by = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))
    contract = relationship("Contract", back_populates="maintenance_requests")
    space = relationship("Space", back_populates="maintenance_requests")


class ContractAmendment(Base):
    """
    A dated amendment (avenant) to an active contract. Records a revision —
    rent change, space addition/removal, term extension — that takes effect on
    effective_date while preserving the prior periods for history.
    """
    __tablename__ = "re_contract_amendments"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("re_contracts.id"), nullable=False)
    amendment_number = Column(String(50))
    effective_date = Column(Date, nullable=False)
    title = Column(String(200))
    reason = Column(Text)
    # JSON-ish summary stored as text (what changed), for traceability/audit
    change_summary = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", back_populates="amendments")
