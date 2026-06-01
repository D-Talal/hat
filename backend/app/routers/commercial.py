from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel, field_validator, model_validator
from datetime import date, datetime
from app.database import get_db
from app.core.deps import get_current_user, get_current_org
from app.core.permissions import require_permission
from app.core.validators import (
    validate_non_empty_string, validate_email, validate_positive_float,
    validate_area, validate_year, validate_currency_code, validate_date_range,
    validate_phone, validate_floor_number, validate_space_code,
    validate_contract_number, validate_condition_amount,
    validate_ipc_index, validate_markup_rate, validate_continent,
    validate_enum,
    VALID_CONTRACT_TYPES, VALID_PAYMENT_TIMINGS, VALID_DAY_COUNT_METHODS,
    VALID_CONDITION_TYPES, VALID_FREQUENCIES, VALID_BP_ROLES,
    VALID_SPACE_STATUSES, VALID_USAGE_TYPES,
)
from app.models.audit import AuditLog
from app.models.retail import (
    CompanyCode,
    BusinessEntity, Building, Floor, Space, SpaceMeasurement,
    RentalObject, RentalObjectSpace,
    BusinessPartner, BusinessPartnerRole,
    Contract, ContractDateSlot, ContractObject,
    Condition, SalesRule, SalesDeclaration,
    ParticipationGroup, ParticipationGroupMember, SettlementUnit, CostCollector,
    DepositContract, VacancyPosting, Invoice, MaintenanceRequest,
    SpaceStatus,
)

router = APIRouter()

def audit(db, user, action, resource, rid=None, details=None, org_id=None):
    db.add(AuditLog(user_id=user.id, user_email=user.email, action=action,
                    resource=resource, resource_id=rid, details=details,
                    org_id=org_id or getattr(user, "organization_id", None)))
    db.commit()


# ── SCHEMAS ───────────────────────────────────────────────────────────────────

class BusinessEntityCreate(BaseModel):
    name: str
    company_code_id: Optional[int] = None
    legal_name: Optional[str] = None
    tax_id: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    continent: Optional[str] = None
    address: Optional[str] = None
    annual_revenue: Optional[float] = 0
    currency: Optional[str] = "USD"

    @field_validator('name')
    @classmethod
    def v_name(cls, v): return validate_non_empty_string(v, 'Name')

    @field_validator('currency')
    @classmethod
    def v_currency(cls, v): return validate_currency_code(v)

    @field_validator('continent')
    @classmethod
    def v_continent(cls, v): return validate_continent(v)

    @field_validator('annual_revenue')
    @classmethod
    def v_revenue(cls, v): return validate_positive_float(v, 'Annual revenue')

class BusinessEntityOut(BusinessEntityCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class BuildingCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    continent: Optional[str] = None
    total_area_sqm: Optional[float] = None
    construction_year: Optional[int] = None

    @field_validator('name')
    @classmethod
    def v_name(cls, v): return validate_non_empty_string(v, 'Building name')

    @field_validator('total_area_sqm')
    @classmethod
    def v_area(cls, v): return validate_area(v)

    @field_validator('construction_year')
    @classmethod
    def v_year(cls, v): return validate_year(v)

    @field_validator('continent')
    @classmethod
    def v_continent(cls, v): return validate_continent(v)

class BuildingOut(BuildingCreate):
    id: int
    business_entity_id: int
    created_at: datetime
    class Config: from_attributes = True

class FloorCreate(BaseModel):
    floor_number: int
    name: Optional[str] = None
    area_sqm: Optional[float] = None

    @field_validator('floor_number')
    @classmethod
    def v_floor_num(cls, v): return validate_floor_number(v)

    @field_validator('area_sqm')
    @classmethod
    def v_area(cls, v): return validate_area(v)

class FloorOut(FloorCreate):
    id: int
    building_id: int
    created_at: datetime
    class Config: from_attributes = True

class MeasurementCreate(BaseModel):
    valid_from: date
    area_sqm: float
    note: Optional[str] = None

    @field_validator('area_sqm')
    @classmethod
    def v_area(cls, v): return validate_area(v)

class SpaceCreate(BaseModel):
    space_code: str
    description: Optional[str] = None
    status: Optional[str] = "available"
    initial_measurement: Optional[MeasurementCreate] = None

    @field_validator('space_code')
    @classmethod
    def v_code(cls, v): return validate_space_code(v)

    @field_validator('status')
    @classmethod
    def v_status(cls, v): return validate_enum(v, VALID_SPACE_STATUSES, 'space status')

class BPRoleCreate(BaseModel):
    role: str
    customer_account: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None

class BusinessPartnerCreate(BaseModel):
    company_name: str
    trade_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    continent: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    tax_id: Optional[str] = None
    roles: Optional[List[BPRoleCreate]] = []

    @field_validator('company_name')
    @classmethod
    def v_company(cls, v): return validate_non_empty_string(v, 'Company name')

    @field_validator('email')
    @classmethod
    def v_email(cls, v): return validate_email(v)

    @field_validator('phone')
    @classmethod
    def v_phone(cls, v): return validate_phone(v)

class BPRoleOut(BaseModel):
    id: int
    role: str
    customer_account: Optional[str] = None
    class Config: from_attributes = True

class BusinessPartnerOut(BaseModel):
    id: int
    bp_number: Optional[str] = None
    company_name: str
    trade_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    continent: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    tax_id: Optional[str] = None
    is_active: bool
    roles: List[BPRoleOut] = []
    created_at: datetime
    class Config: from_attributes = True

class ContractCreate(BaseModel):
    contract_number: Optional[str] = None
    business_partner_id: int
    business_entity_id: int
    contract_type: Optional[str] = "lease_out"
    start_date: date
    first_end_date: Optional[date] = None
    probable_end_date: Optional[date] = None
    absolute_end_date: Optional[date] = None
    notice_date: Optional[date] = None
    signing_date: Optional[date] = None
    relevant_to_sales: Optional[bool] = False
    is_multi_object: Optional[bool] = False
    payment_timing: Optional[str] = "in_advance"
    day_count_method: Optional[str] = "act_365"
    pro_rata_enabled: Optional[bool] = True
    notes: Optional[str] = None
    rental_object_ids: Optional[List[int]] = []

    @field_validator('contract_number')
    @classmethod
    def v_num(cls, v): return validate_contract_number(v)

    @field_validator('contract_type')
    @classmethod
    def v_type(cls, v): return validate_enum(v, VALID_CONTRACT_TYPES, 'contract type')

    @field_validator('payment_timing')
    @classmethod
    def v_payment(cls, v): return validate_enum(v, VALID_PAYMENT_TIMINGS, 'payment timing')

    @field_validator('day_count_method')
    @classmethod
    def v_day_count(cls, v): return validate_enum(v, VALID_DAY_COUNT_METHODS, 'day count method')

    @model_validator(mode='after')
    def v_dates(self):
        validate_date_range(self.start_date, self.absolute_end_date, 'Start date', 'End date')
        validate_date_range(self.start_date, self.probable_end_date, 'Start date', 'Probable end date')
        validate_date_range(self.start_date, self.first_end_date, 'Start date', 'First end date')
        if self.signing_date and self.start_date and self.signing_date > self.start_date:
            pass  # signing before or on start is normal, after is unusual but allowed
        return self

class ContractPatch(BaseModel):
    status: Optional[str] = None
    probable_end_date: Optional[date] = None
    absolute_end_date: Optional[date] = None
    notes: Optional[str] = None

class BusinessEntityMini(BaseModel):
    id: int
    name: str
    currency: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    class Config: from_attributes = True

class RentalObjectMini(BaseModel):
    id: int
    code: str
    usage_type: Optional[str] = None
    status: Optional[str] = None
    class Config: from_attributes = True

class ContractOut(BaseModel):
    id: int
    contract_number: Optional[str] = None
    contract_type: str
    status: str
    start_date: date
    first_end_date: Optional[date] = None
    probable_end_date: Optional[date] = None
    absolute_end_date: Optional[date] = None
    notice_date: Optional[date] = None
    signing_date: Optional[date] = None
    relevant_to_sales: bool
    is_multi_object: bool
    payment_timing: str
    day_count_method: str
    pro_rata_enabled: bool
    notes: Optional[str] = None
    created_at: datetime
    business_partner: Optional[BusinessPartnerOut] = None
    business_entity: Optional[BusinessEntityMini] = None
    class Config: from_attributes = True

class ConditionCreate(BaseModel):
    contract_id: int
    condition_type: str
    condition_code: Optional[str] = None
    valid_from: date
    valid_to: Optional[date] = None
    amount: Optional[float] = None
    currency: Optional[str] = "USD"
    frequency: Optional[str] = "monthly"
    payment_timing: Optional[str] = "in_advance"
    ipc_enabled: Optional[bool] = False
    ipc_base_index: Optional[float] = None
    ipc_reference_date: Optional[date] = None
    is_flat_rate: Optional[bool] = False
    markup_rate: Optional[float] = None
    notes: Optional[str] = None

    @field_validator('condition_type')
    @classmethod
    def v_type(cls, v): return validate_enum(v, VALID_CONDITION_TYPES, 'condition type')

    @field_validator('amount')
    @classmethod
    def v_amount(cls, v): return validate_condition_amount(v)

    @field_validator('currency')
    @classmethod
    def v_currency(cls, v): return validate_currency_code(v)

    @field_validator('frequency')
    @classmethod
    def v_freq(cls, v): return validate_enum(v, VALID_FREQUENCIES, 'frequency')

    @field_validator('payment_timing')
    @classmethod
    def v_timing(cls, v): return validate_enum(v, VALID_PAYMENT_TIMINGS, 'payment timing')

    @field_validator('ipc_base_index')
    @classmethod
    def v_ipc(cls, v): return validate_ipc_index(v)

    @field_validator('markup_rate')
    @classmethod
    def v_markup(cls, v): return validate_markup_rate(v)

    @model_validator(mode='after')
    def v_dates(self):
        validate_date_range(self.valid_from, self.valid_to, 'Valid from', 'Valid to')
        if self.condition_type == 'base_rent' and (self.amount is None or self.amount == 0):
            raise ValueError('Base rent amount must be greater than 0')
        if self.ipc_enabled and not self.ipc_base_index:
            raise ValueError('IPC base index is required when IPC is enabled')
        return self

class ConditionOut(ConditionCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class RentalObjectCreate(BaseModel):
    building_id: Optional[int] = None
    code: str
    description: Optional[str] = None
    usage_type: Optional[str] = "retail"
    status: Optional[str] = "available"
    cost_center: Optional[str] = None
    im_key: Optional[str] = None
    space_ids: Optional[List[int]] = []

    @field_validator('code')
    @classmethod
    def v_code(cls, v):
        v = v.strip()
        if not v: raise ValueError('Code is required')
        if len(v) > 50: raise ValueError('Code must be under 50 characters')
        return v

    @field_validator('usage_type')
    @classmethod
    def v_usage(cls, v): return validate_enum(v, VALID_USAGE_TYPES, 'usage type')

    @field_validator('status')
    @classmethod
    def v_status(cls, v): return validate_enum(v, VALID_SPACE_STATUSES, 'status')

class RentalObjectOut(BaseModel):
    id: int
    building_id: int
    code: str
    description: Optional[str] = None
    usage_type: Optional[str] = None
    status: str
    cost_center: Optional[str] = None
    im_key: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class PGMemberCreate(BaseModel):
    contract_object_id: int
    excluded: Optional[bool] = False
    max_cost: Optional[float] = None
    markup_rate: Optional[float] = 0

class ParticipationGroupCreate(BaseModel):
    building_id: int
    code: str
    name: Optional[str] = None
    charge_category: Optional[str] = "general"
    members: Optional[List[PGMemberCreate]] = []

class ParticipationGroupOut(BaseModel):
    id: int
    building_id: int
    code: str
    name: Optional[str] = None
    charge_category: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class CostCollectorCreate(BaseModel):
    settlement_unit_id: Optional[int] = None
    participation_group_id: Optional[int] = None
    charge_category: Optional[str] = "general"
    description: Optional[str] = None
    total_costs: Optional[float] = 0
    ancillary_revenues: Optional[float] = 0
    net_pool: Optional[float] = 0
    fiscal_year: Optional[int] = None

class CostCollectorOut(CostCollectorCreate):
    id: int
    status: str
    created_at: datetime
    class Config: from_attributes = True

class InvoiceCreate(BaseModel):
    contract_id: int
    condition_type: Optional[str] = None
    amount: float
    currency: Optional[str] = "USD"
    due_date: Optional[date] = None
    period_from: Optional[date] = None
    period_to: Optional[date] = None
    description: Optional[str] = None

    @field_validator('amount')
    @classmethod
    def v_amount(cls, v):
        if v < 0: raise ValueError('Invoice amount cannot be negative')
        return v

    @field_validator('currency')
    @classmethod
    def v_currency(cls, v): return validate_currency_code(v)

    @field_validator('condition_type')
    @classmethod
    def v_type(cls, v): return validate_enum(v, VALID_CONDITION_TYPES, 'condition type') if v else v

    @model_validator(mode='after')
    def v_period(self):
        validate_date_range(self.period_from, self.period_to, 'Period from', 'Period to')
        return self

class InvoiceOut(InvoiceCreate):
    id: int
    paid_date: Optional[date] = None
    status: str
    is_catch_up: bool
    created_at: datetime
    class Config: from_attributes = True

class MaintenanceCreate(BaseModel):
    contract_id: Optional[int] = None
    rental_object_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    reported_by: Optional[str] = None

class MaintenanceOut(MaintenanceCreate):
    id: int
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    class Config: from_attributes = True


# ── BUSINESS ENTITIES ─────────────────────────────────────────────────────────

# ── COMPANY CODES ─────────────────────────────────────────────────────────────

class CompanyCodeCreate(BaseModel):
    code:        str
    name:        str
    currency:    Optional[str] = "USD"
    country:     Optional[str] = None
    state:       Optional[str] = None
    description: Optional[str] = None

    @field_validator('code')
    @classmethod
    def v_code(cls, v):
        v = v.strip().upper()
        if not v: raise ValueError('Code is required')
        if len(v) > 20: raise ValueError('Code must be under 20 characters')
        return v

    @field_validator('name')
    @classmethod
    def v_name(cls, v): return validate_non_empty_string(v, 'Name')

    @field_validator('currency')
    @classmethod
    def v_currency(cls, v): return validate_currency_code(v)

class CompanyCodeOut(CompanyCodeCreate):
    id: int
    org_id: Optional[int] = None
    created_at: datetime
    class Config: from_attributes = True

@router.get("/company-codes", response_model=List[CompanyCodeOut])
def list_company_codes(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    return db.query(CompanyCode).filter(CompanyCode.org_id == org.id).order_by(CompanyCode.code).all()

@router.post("/company-codes", response_model=CompanyCodeOut)
def create_company_code(data: CompanyCodeCreate, db: Session = Depends(get_db), u=Depends(require_permission("create")), org=Depends(get_current_org)):
    if db.query(CompanyCode).filter(CompanyCode.org_id == org.id, CompanyCode.code == data.code).first():
        raise HTTPException(400, f"Company code '{data.code}' already exists")
    obj = CompanyCode(**data.dict(), org_id=org.id)
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_company_codes", obj.id)
    return obj

@router.put("/company-codes/{id}", response_model=CompanyCodeOut)
def update_company_code(id: int, data: CompanyCodeCreate, db: Session = Depends(get_db), u=Depends(require_permission("update")), org=Depends(get_current_org)):
    obj = db.query(CompanyCode).filter(CompanyCode.id == id, CompanyCode.org_id == org.id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_company_codes", id)
    return obj

@router.delete("/company-codes/{id}")
def delete_company_code(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    obj = db.query(CompanyCode).filter(CompanyCode.id == id, CompanyCode.org_id == org.id).first()
    if not obj: raise HTTPException(404, "Not found")
    be_count = db.query(BusinessEntity).filter(BusinessEntity.company_code_id == id).count()
    if be_count > 0:
        raise HTTPException(400, f"Cannot delete: {be_count} business entit{'ies' if be_count>1 else 'y'} linked to this company code. Reassign them first.")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_company_codes", id)
    return {"ok": True}


@router.get("/business-entities", response_model=List[BusinessEntityOut])
def list_business_entities(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    return db.query(BusinessEntity).filter(BusinessEntity.org_id == org.id).all()

@router.post("/business-entities", response_model=BusinessEntityOut)
def create_business_entity(data: BusinessEntityCreate, db: Session = Depends(get_db), u=Depends(require_permission("create")), org=Depends(get_current_org)):
    obj = BusinessEntity(**data.dict(), org_id=org.id)
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_business_entities", obj.id)
    return obj

@router.put("/business-entities/{id}", response_model=BusinessEntityOut)
def update_business_entity(id: int, data: BusinessEntityCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(BusinessEntity).filter(BusinessEntity.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/business-entities/{id}")
def delete_business_entity(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    obj = db.query(BusinessEntity).filter(BusinessEntity.id == id, BusinessEntity.org_id == org.id).first()
    if not obj: raise HTTPException(404, "Not found")
    building_count = db.query(Building).filter(Building.business_entity_id == id).count()
    if building_count > 0:
        raise HTTPException(400, f"Cannot delete: this property has {building_count} building(s). Remove them first.")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_business_entities", id)
    return {"ok": True}


# ── BUILDINGS ─────────────────────────────────────────────────────────────────

@router.get("/business-entities/{be_id}/buildings", response_model=List[BuildingOut])
def list_buildings(be_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.query(Building).filter(Building.business_entity_id == be_id).all()

@router.get("/buildings", response_model=List[BuildingOut])
def list_all_buildings(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    be_ids = [be.id for be in db.query(BusinessEntity).filter(BusinessEntity.org_id == org.id).all()]
    return db.query(Building).filter(Building.business_entity_id.in_(be_ids)).all()

@router.post("/business-entities/{be_id}/buildings", response_model=BuildingOut)
def create_building(be_id: int, data: BuildingCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = Building(business_entity_id=be_id, **data.dict())
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_buildings", obj.id); return obj

@router.put("/buildings/{id}", response_model=BuildingOut)
def update_building(id: int, data: BuildingCreate, db: Session = Depends(get_db), u=Depends(require_permission("update")), org=Depends(get_current_org)):
    obj = db.query(Building).filter(Building.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    # Validate: building area must be >= sum of floor areas
    if data.total_area_sqm is not None:
        from sqlalchemy import func as sqlfunc
        floor_total = db.query(sqlfunc.coalesce(sqlfunc.sum(Floor.area_sqm), 0)).filter(Floor.building_id == id).scalar() or 0
        if data.total_area_sqm < floor_total:
            raise HTTPException(400, f"Building area ({data.total_area_sqm} m²) cannot be smaller than the total floor area ({floor_total:.1f} m²).")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_buildings", id)
    return obj

@router.delete("/buildings/{id}")
def delete_building(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    obj = db.query(Building).filter(Building.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    floor_count = db.query(Floor).filter(Floor.building_id == id).count()
    if floor_count > 0:
        raise HTTPException(400, f"Cannot delete: this building has {floor_count} floor(s). Remove them first.")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_buildings", id)
    return {"ok": True}


# ── FLOORS ────────────────────────────────────────────────────────────────────

@router.get("/buildings/{building_id}/floors", response_model=List[FloorOut])
def list_floors(building_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.query(Floor).filter(Floor.building_id == building_id).order_by(Floor.floor_number).all()

@router.post("/buildings/{building_id}/floors", response_model=FloorOut)
def create_floor(building_id: int, data: FloorCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = Floor(building_id=building_id, **data.dict())
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.put("/floors/{id}", response_model=FloorOut)
def update_floor(id: int, data: FloorCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Floor).filter(Floor.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    # Validate: floor area must be >= sum of space areas
    if data.area_sqm is not None:
        from sqlalchemy import func as sqlfunc
        from app.models.retail import SpaceMeasurement
        space_ids = [s.id for s in db.query(Space).filter(Space.floor_id == id).all()]
        if space_ids:
            space_total = 0
            for sid in space_ids:
                latest = db.query(SpaceMeasurement).filter(
                    SpaceMeasurement.space_id == sid, SpaceMeasurement.valid_to == None
                ).order_by(SpaceMeasurement.valid_from.desc()).first()
                if latest: space_total += float(latest.area_sqm or 0)
            if data.area_sqm < space_total:
                raise HTTPException(400, f"Floor area ({data.area_sqm} m²) cannot be smaller than the total space area ({space_total:.1f} m²).")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_floors", id)
    return obj

@router.delete("/floors/{id}")
def delete_floor(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Floor).filter(Floor.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    space_count = db.query(Space).filter(Space.floor_id == id).count()
    if space_count > 0:
        raise HTTPException(400, f"Cannot delete: this floor has {space_count} space(s). Remove them first.")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_floors", id)
    return {"ok": True}


# ── SPACES ────────────────────────────────────────────────────────────────────

def _space_with_area(space, db=None):
    # If db passed, reload measurements fresh from DB to avoid stale cache
    if db:
        from sqlalchemy.orm import joinedload as jl
        space = db.query(Space).filter(Space.id == space.id).options(jl(Space.measurements)).first()
    current = next(
        (m for m in sorted(space.measurements, key=lambda m: m.valid_from, reverse=True) if not m.valid_to),
        None
    )
    d = {c.name: getattr(space, c.name) for c in space.__table__.columns}
    # Force enum → plain string (avoids "SpaceStatus.available" serialization bug)
    d["status"] = space.status.value if hasattr(space.status, 'value') else str(space.status).split('.')[-1] if space.status else "available"
    d["current_area_sqm"]   = float(current.area_sqm)  if current else None
    d["current_valid_from"] = str(current.valid_from)   if current else None
    d["initial_measurement"] = None
    return d

@router.get("/floors/{floor_id}/spaces")
def list_spaces(floor_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    spaces = db.query(Space).filter(Space.floor_id == floor_id).options(joinedload(Space.measurements)).all()
    return [_space_with_area(s) for s in spaces]

@router.get("/buildings/{building_id}/available-spaces")
def list_available_spaces(building_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    assigned = [r.space_id for r in db.query(RentalObjectSpace).all()]
    floor_ids = [f.id for f in db.query(Floor).filter(Floor.building_id == building_id).all()]
    spaces = (db.query(Space)
               .filter(Space.floor_id.in_(floor_ids), ~Space.id.in_(assigned))
               .options(joinedload(Space.measurements)).all())
    return [_space_with_area(s) for s in spaces]

@router.post("/floors/{floor_id}/spaces")
def create_space(floor_id: int, data: SpaceCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    payload = data.dict(exclude={"initial_measurement"})
    obj = Space(floor_id=floor_id, **payload)
    db.add(obj); db.flush()
    if data.initial_measurement:
        db.add(SpaceMeasurement(space_id=obj.id, **data.initial_measurement.dict()))
    db.commit(); db.refresh(obj)
    return _space_with_area(obj)

@router.put("/spaces/{id}")
def update_space(id: int, data: SpaceCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Space).filter(Space.id == id).options(joinedload(Space.measurements)).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict(exclude={"initial_measurement"}).items():
        setattr(obj, k, v)
    if data.initial_measurement:
        from app.models.retail import SpaceMeasurement
        # Find the current active measurement (no valid_to)
        current = next(
            (m for m in sorted(obj.measurements, key=lambda m: m.valid_from, reverse=True) if not m.valid_to),
            None
        )
        if current:
            # Update in place — change area and/or date on the existing record
            current.area_sqm  = data.initial_measurement.area_sqm
            current.valid_from = data.initial_measurement.valid_from
            if data.initial_measurement.note:
                current.note = data.initial_measurement.note
        else:
            # No active measurement yet — create one
            db.add(SpaceMeasurement(space_id=obj.id, **data.initial_measurement.dict()))
    db.commit()
    db.refresh(obj)
    audit(db, u, "UPDATE", "re_spaces", id)
    return _space_with_area(obj, db=db)

@router.delete("/spaces/{id}")
def delete_space(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Space).filter(Space.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    ro_count = db.query(RentalObjectSpace).filter(RentalObjectSpace.space_id == id).count()
    if ro_count > 0:
        raise HTTPException(400, f"Cannot delete: this space is linked to {ro_count} rental object(s). Remove them first.")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_spaces", id)
    return {"ok": True}


# ── BUSINESS PARTNERS ─────────────────────────────────────────────────────────

@router.get("/business-partners", response_model=List[BusinessPartnerOut])
def list_partners(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    return db.query(BusinessPartner).filter(BusinessPartner.org_id == org.id).options(joinedload(BusinessPartner.roles)).all()

@router.post("/business-partners", response_model=BusinessPartnerOut)
def create_partner(data: BusinessPartnerCreate, db: Session = Depends(get_db), u=Depends(require_permission("create")), org=Depends(get_current_org)):
    roles = data.roles or []
    payload = data.dict(exclude={"roles"})
    obj = BusinessPartner(**payload, org_id=org.id)
    count = db.query(BusinessPartner).filter(BusinessPartner.org_id == org.id).count()
    obj.bp_number = f"BP-{count + 1:05d}"
    db.add(obj); db.flush()
    for r in roles:
        db.add(BusinessPartnerRole(business_partner_id=obj.id, **r.dict()))
    db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_business_partners", obj.id); return obj

@router.put("/business-partners/{id}", response_model=BusinessPartnerOut)
def update_partner(id: int, data: BusinessPartnerCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(BusinessPartner).filter(BusinessPartner.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict(exclude={"roles"}).items(): setattr(obj, k, v)
    db.query(BusinessPartnerRole).filter(BusinessPartnerRole.business_partner_id == id).delete()
    for r in (data.roles or []):
        db.add(BusinessPartnerRole(business_partner_id=id, **r.dict()))
    db.commit(); db.refresh(obj); return obj

@router.delete("/business-partners/{id}")
def delete_partner(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(BusinessPartner).filter(BusinessPartner.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}


# ── CONTRACTS ─────────────────────────────────────────────────────────────────

@router.get("/contracts", response_model=List[ContractOut])
def list_contracts(status: Optional[str] = None, db: Session = Depends(get_db), u=Depends(get_current_user)):
    q = db.query(Contract).options(
        joinedload(Contract.business_partner).joinedload(BusinessPartner.roles),
        joinedload(Contract.business_entity),
    )
    # Filter by org via business_entity
    if u.organization_id:
        q = q.join(BusinessEntity, Contract.business_entity_id == BusinessEntity.id).filter(
            (BusinessEntity.org_id == u.organization_id) | (BusinessEntity.org_id == None)
        )
    if status: q = q.filter(Contract.status == status)
    return q.all()

@router.post("/contracts", response_model=ContractOut)
def create_contract(data: ContractCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    ro_ids = data.rental_object_ids or []
    payload = data.dict(exclude={"rental_object_ids"})
    if not payload.get("contract_number"):
        count = db.query(Contract).count()
        payload["contract_number"] = f"LO-{count + 1:05d}"
    obj = Contract(**payload)
    db.add(obj); db.flush()
    for ro_id in ro_ids:
        db.add(ContractObject(contract_id=obj.id, rental_object_id=ro_id, valid_from=data.start_date))
    db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_contracts", obj.id); return obj

@router.patch("/contracts/{id}", response_model=ContractOut)
def patch_contract(id: int, data: ContractPatch, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Contract).options(
        joinedload(Contract.business_partner),
        joinedload(Contract.business_entity),
    ).filter(Contract.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    # Validate release
    if data.status == "released":
        if obj.status != "draft":
            raise HTTPException(400, f"Cannot release a contract with status '{obj.status}'")
        condition_count = db.query(Condition).filter(Condition.contract_id == id).count()
        if condition_count == 0:
            raise HTTPException(400, "Cannot release: contract has no conditions. Add at least one condition (base rent, etc.) before releasing.")
    for k, v in data.dict(exclude_none=True).items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_contracts", id, f"status={obj.status}"); return obj

@router.delete("/contracts/{id}")
def delete_contract(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Contract).filter(Contract.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}


# ── CONDITIONS ────────────────────────────────────────────────────────────────

@router.get("/conditions", response_model=List[ConditionOut])
def list_conditions(contract_id: Optional[int] = None, db: Session = Depends(get_db), u=Depends(get_current_user)):
    q = db.query(Condition)
    if contract_id: q = q.filter(Condition.contract_id == contract_id)
    return q.all()

@router.post("/conditions", response_model=ConditionOut)
def create_condition(data: ConditionCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = Condition(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_conditions", obj.id); return obj

@router.put("/conditions/{id}", response_model=ConditionOut)
def update_condition(id: int, data: ConditionCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Condition).filter(Condition.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/conditions/{id}")
def delete_condition(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Condition).filter(Condition.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}


# ── RENTAL OBJECTS ────────────────────────────────────────────────────────────

@router.get("/debug/db-state")
def debug_db_state(db: Session = Depends(get_db), u=Depends(get_current_user)):
    """Temporary diagnostic endpoint — shows counts and data chain"""
    from sqlalchemy import text
    ro_count    = db.query(RentalObject).count()
    be_count    = db.query(BusinessEntity).count()
    bld_count   = db.query(Building).count()
    # Raw data
    ros = db.query(RentalObject).limit(10).all()
    blds = db.query(Building).limit(10).all()
    bes  = db.query(BusinessEntity).limit(10).all()
    return {
        "user_org_id": u.organization_id,
        "counts": {
            "rental_objects": ro_count,
            "buildings": bld_count,
            "business_entities": be_count,
        },
        "rental_objects": [{"id": r.id, "code": r.code, "building_id": r.building_id, "status": str(r.status)} for r in ros],
        "buildings": [{"id": b.id, "name": b.name, "business_entity_id": b.business_entity_id} for b in blds],
        "business_entities": [{"id": e.id, "name": e.name, "org_id": e.org_id} for e in bes],
    }

@router.get("/rental-objects")
def list_rental_objects(building_id: Optional[int] = None, business_entity_id: Optional[int] = None, db: Session = Depends(get_db), u=Depends(get_current_user)):
    # Bare minimum — no joinedload, no filters, just count and return all
    all_ros = db.query(RentalObject).all()
    results = []
    for ro in all_ros:
        st = ro.status
        status_str = st.value if hasattr(st, 'value') else (str(st).split('.')[-1] if st else "available")
        # Load building separately
        building = db.query(Building).filter(Building.id == ro.building_id).first()
        results.append({
            "id": ro.id,
            "code": ro.code,
            "description": ro.description,
            "usage_type": ro.usage_type,
            "status": status_str,
            "building_id": ro.building_id,
            "cost_center": ro.cost_center,
            "im_key": ro.im_key,
            "created_at": str(ro.created_at),
            "building_entity_id": building.business_entity_id if building else None,
            "building": {"id": building.id, "name": building.name, "business_entity_id": building.business_entity_id} if building else None,
            "spaces": [],
        })
    return results

@router.post("/rental-objects", response_model=RentalObjectOut)
def create_rental_object(data: RentalObjectCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    space_ids = data.space_ids or []
    payload = data.dict(exclude={"space_ids"})
    obj = RentalObject(**payload)
    db.add(obj); db.flush()
    for sid in space_ids:
        db.add(RentalObjectSpace(rental_object_id=obj.id, space_id=sid))
    db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_rental_objects", obj.id); return obj

@router.put("/rental-objects/{id}", response_model=RentalObjectOut)
def update_rental_object(id: int, data: RentalObjectCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(RentalObject).filter(RentalObject.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    # Exclude space_ids, building_id (immutable after creation), and None values
    update_fields = {
        k: v for k, v in data.dict(exclude={"space_ids", "building_id"}).items()
        if v is not None
    }
    for k, v in update_fields.items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/rental-objects/{id}")
def delete_rental_object(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(RentalObject).filter(RentalObject.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

@router.get("/buildings/{building_id}/contract-objects")
def list_contract_objects_for_building(building_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    ros = db.query(RentalObject).filter(RentalObject.building_id == building_id).all()
    ro_ids = [r.id for r in ros]
    cos = db.query(ContractObject).options(
        joinedload(ContractObject.contract).joinedload(Contract.business_partner),
        joinedload(ContractObject.rental_object)
    ).filter(ContractObject.rental_object_id.in_(ro_ids)).all()
    return [{"id": co.id, "contract": {"id": co.contract.id, "contract_number": co.contract.contract_number}, "rental_object": {"id": co.rental_object.id, "code": co.rental_object.code}} for co in cos]


# ── PARTICIPATION GROUPS ──────────────────────────────────────────────────────

@router.get("/participation-groups")
def list_participation_groups(db: Session = Depends(get_db), u=Depends(get_current_user)):
    groups = db.query(ParticipationGroup).options(
        joinedload(ParticipationGroup.building),
        joinedload(ParticipationGroup.members).joinedload(ParticipationGroupMember.contract_object),
        joinedload(ParticipationGroup.settlement_units).joinedload(SettlementUnit.cost_collectors),
    ).all()
    results = []
    for g in groups:
        d = {c.name: getattr(g, c.name) for c in g.__table__.columns}
        d["building"] = {"id": g.building.id, "name": g.building.name} if g.building else None
        d["members"] = [{"id": m.id, "excluded": m.excluded, "max_cost": float(m.max_cost) if m.max_cost else None, "markup_rate": m.markup_rate, "contract_object": {"id": m.contract_object.id} if m.contract_object else None} for m in g.members]
        d["settlement_units"] = [{"id": su.id, "code": su.code, "cost_collectors": [{"id": cc.id, "charge_category": cc.charge_category, "status": cc.status, "total_costs": float(cc.total_costs or 0), "ancillary_revenues": float(cc.ancillary_revenues or 0), "net_pool": float(cc.net_pool or 0), "fiscal_year": cc.fiscal_year} for cc in su.cost_collectors]} for su in g.settlement_units]
        results.append(d)
    return results

@router.post("/participation-groups", response_model=ParticipationGroupOut)
def create_participation_group(data: ParticipationGroupCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    members = data.members or []
    payload = data.dict(exclude={"members"})
    obj = ParticipationGroup(**payload)
    db.add(obj); db.flush()
    su = SettlementUnit(participation_group_id=obj.id, code=f"SU-{obj.code}", fiscal_year=2025)
    db.add(su); db.flush()
    for m in members:
        db.add(ParticipationGroupMember(participation_group_id=obj.id, **m.dict()))
    db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_participation_groups", obj.id); return obj

@router.put("/participation-groups/{id}", response_model=ParticipationGroupOut)
def update_participation_group(id: int, data: ParticipationGroupCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(ParticipationGroup).filter(ParticipationGroup.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict(exclude={"members"}).items():
        setattr(obj, k, v)
    # Sync members: delete existing then re-add
    db.query(ParticipationGroupMember).filter(ParticipationGroupMember.participation_group_id == id).delete()
    for m in (data.members or []):
        db.add(ParticipationGroupMember(participation_group_id=id, **m.dict()))
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_participation_groups", id)
    return obj

@router.delete("/participation-groups/{id}")
def delete_participation_group(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(ParticipationGroup).filter(ParticipationGroup.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    cc_count = db.query(CostCollector).join(SettlementUnit).filter(
        SettlementUnit.participation_group_id == id
    ).count()
    if cc_count > 0:
        raise HTTPException(400, f"Cannot delete: this group has {cc_count} cost collector(s). Remove them first.")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_participation_groups", id)
    return {"ok": True}


# ── COST COLLECTORS ───────────────────────────────────────────────────────────

@router.post("/cost-collectors", response_model=CostCollectorOut)
def create_cost_collector(data: CostCollectorCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    payload = data.dict(exclude={"participation_group_id"})
    if not payload.get("settlement_unit_id") and data.participation_group_id:
        su = db.query(SettlementUnit).filter(SettlementUnit.participation_group_id == data.participation_group_id).first()
        if su: payload["settlement_unit_id"] = su.id
    obj = CostCollector(**payload)
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.put("/cost-collectors/{id}", response_model=CostCollectorOut)
def update_cost_collector(id: int, data: CostCollectorCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(CostCollector).filter(CostCollector.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    if obj.status == "settled":
        raise HTTPException(400, "Cannot edit a settled cost collector.")
    for k, v in data.dict(exclude={"participation_group_id"}).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_cost_collectors", id)
    return obj

@router.delete("/cost-collectors/{id}")
def delete_cost_collector(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(CostCollector).filter(CostCollector.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    if obj.status == "settled":
        raise HTTPException(400, "Cannot delete a settled cost collector.")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_cost_collectors", id)
    return {"ok": True}

@router.patch("/cost-collectors/{id}/settle")
def settle_cost_collector(id: int, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(CostCollector).filter(CostCollector.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    obj.status = "settled"
    obj.settled_at = datetime.utcnow()
    db.commit(); return {"ok": True, "status": "settled"}


# ── INVOICES ──────────────────────────────────────────────────────────────────

@router.get("/invoices", response_model=List[InvoiceOut])
def list_invoices(contract_id: Optional[int] = None, db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    contract_ids_q = db.query(Contract.id).filter(Contract.business_entity_id.in_(be_ids)) if be_ids else []
    q = db.query(Invoice).filter(Invoice.contract_id.in_(contract_ids_q))
    if contract_id: q = q.filter(Invoice.contract_id == contract_id)
    return q.order_by(Invoice.due_date.desc()).all()

@router.post("/invoices", response_model=InvoiceOut)
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db), u=Depends(require_permission("create")), org=Depends(get_current_org)):
    # Verify contract belongs to org
    contract = db.query(Contract).filter(Contract.id == data.contract_id, Contract.business_entity_id.in_(
        db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id)
    )).first()
    if not contract: raise HTTPException(404, "Contract not found")
    obj = Invoice(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_invoices", obj.id)
    return obj

@router.patch("/invoices/{id}/pay")
def mark_invoice_paid(id: int, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Invoice).filter(Invoice.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    obj.status = "paid"
    obj.paid_date = date.today()
    db.commit()
    audit(db, u, "UPDATE", "re_invoices", obj.id)
    return {"ok": True}

@router.put("/invoices/{id}", response_model=InvoiceOut)
def update_invoice(id: int, data: InvoiceCreate, db: Session = Depends(get_db), u=Depends(require_permission("update")), org=Depends(get_current_org)):
    obj = db.query(Invoice).join(Contract).filter(
        Invoice.id == id,
        Contract.business_entity_id.in_(db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id))
    ).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_invoices", obj.id)
    return obj

@router.delete("/invoices/{id}")
def delete_invoice(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    obj = db.query(Invoice).join(Contract).filter(
        Invoice.id == id,
        Contract.business_entity_id.in_(db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id))
    ).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_invoices", id)
    return {"ok": True}


# ── MAINTENANCE ───────────────────────────────────────────────────────────────

@router.get("/maintenance", response_model=List[MaintenanceOut])
def list_maintenance(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.query(MaintenanceRequest).all()

@router.post("/maintenance", response_model=MaintenanceOut)
def create_maintenance(data: MaintenanceCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = MaintenanceRequest(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/maintenance/{id}")
def update_maintenance(id: int, status: str, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    obj.status = status
    if status == "closed":
        obj.resolved_at = datetime.utcnow()
    db.commit(); return {"ok": True}


# ── STATS ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
def commercial_stats(db: Session = Depends(get_db), u=Depends(get_current_user)):
    total_objects    = db.query(RentalObject).count()
    occupied         = db.query(RentalObject).filter(RentalObject.status == "occupied").count()
    active_contracts = db.query(Contract).filter(Contract.status == "released").count()
    draft_contracts  = db.query(Contract).filter(Contract.status == "draft").count()
    total_partners   = db.query(BusinessPartner).count()
    pending_invoices = db.query(Invoice).filter(Invoice.status == "pending").count()
    total_revenue    = db.query(func.sum(Invoice.amount)).filter(Invoice.status == "paid").scalar() or 0
    return {
        "total_rental_objects": total_objects,
        "occupied_objects": occupied,
        "occupancy_rate": round((occupied / total_objects * 100) if total_objects else 0, 1),
        "active_contracts": active_contracts,
        "draft_contracts": draft_contracts,
        "total_partners": total_partners,
        "pending_invoices": pending_invoices,
        "total_revenue_collected": float(total_revenue),
    }


# ── DEPOSIT CONTRACTS ─────────────────────────────────────────────────────────

class DepositCreate(BaseModel):
    main_contract_id: int
    business_partner_id: int
    calc_method: Optional[str] = "fixed"
    months_of_rent: Optional[float] = None
    amount: Optional[float] = None
    currency: Optional[str] = "USD"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator('calc_method')
    @classmethod
    def v_method(cls, v): return validate_enum(v, {"fixed","months_of_rent"}, "calc method")

    @field_validator('amount')
    @classmethod
    def v_amount(cls, v): return validate_positive_float(v, "Amount")

    @field_validator('currency')
    @classmethod
    def v_cur(cls, v): return validate_currency_code(v)

    @field_validator('months_of_rent')
    @classmethod
    def v_months(cls, v):
        if v is not None and (v <= 0 or v > 36):
            raise ValueError("Months of rent must be between 0 and 36")
        return v

    @model_validator(mode='after')
    def v_calc(self):
        if self.calc_method == "fixed" and not self.amount:
            raise ValueError("Amount is required when calc method is 'fixed'")
        if self.calc_method == "months_of_rent" and not self.months_of_rent:
            raise ValueError("Months of rent is required when calc method is 'months_of_rent'")
        validate_date_range(self.start_date, self.end_date, "Start date", "End date")
        return self

class DepositOut(DepositCreate):
    id: int
    deposit_number: Optional[str] = None
    status: str
    refunded_at: Optional[datetime] = None
    created_at: datetime
    class Config: from_attributes = True

@router.get("/deposit-contracts")
def list_deposits(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    cids = db.query(Contract.id).filter(Contract.business_entity_id.in_(be_ids)) if be_ids else []
    items = db.query(DepositContract).filter(DepositContract.main_contract_id.in_(cids))        .options(joinedload(DepositContract.main_contract), joinedload(DepositContract.business_partner))        .order_by(DepositContract.created_at.desc()).all()
    return items

@router.post("/deposit-contracts", response_model=DepositOut)
def create_deposit(data: DepositCreate, db: Session = Depends(get_db), u=Depends(require_permission("create")), org=Depends(get_current_org)):
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    contract = db.query(Contract).filter(Contract.id == data.main_contract_id, Contract.business_entity_id.in_(be_ids)).first()
    if not contract: raise HTTPException(404, "Contract not found")
    count = db.query(DepositContract).count()
    obj = DepositContract(**data.dict(), deposit_number=f"DEP-{count+1:05d}")
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_deposit_contracts", obj.id)
    return obj

@router.put("/deposit-contracts/{id}", response_model=DepositOut)
def update_deposit(id: int, data: DepositCreate, db: Session = Depends(get_db), u=Depends(require_permission("update")), org=Depends(get_current_org)):
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    obj = db.query(DepositContract).join(Contract).filter(DepositContract.id == id, Contract.business_entity_id.in_(be_ids)).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_deposit_contracts", id)
    return obj

@router.patch("/deposit-contracts/{id}/refund")
def refund_deposit(id: int, db: Session = Depends(get_db), u=Depends(require_permission("update")), org=Depends(get_current_org)):
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    obj = db.query(DepositContract).join(Contract).filter(DepositContract.id == id, Contract.business_entity_id.in_(be_ids)).first()
    if not obj: raise HTTPException(404, "Not found")
    if obj.status == "refunded": raise HTTPException(400, "Already refunded")
    obj.status = "refunded"
    from datetime import timezone
    obj.refunded_at = datetime.now(timezone.utc)
    db.commit()
    audit(db, u, "UPDATE", "re_deposit_contracts", id)
    return {"ok": True}

@router.delete("/deposit-contracts/{id}")
def delete_deposit(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    obj = db.query(DepositContract).join(Contract).filter(DepositContract.id == id, Contract.business_entity_id.in_(be_ids)).first()
    if not obj: raise HTTPException(404, "Not found")
    if obj.status == "active": raise HTTPException(400, "Cannot delete an active deposit. Refund it first.")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_deposit_contracts", id)
    return {"ok": True}


# ── VACANCY POSTINGS ──────────────────────────────────────────────────────────

class VacancyCreate(BaseModel):
    rental_object_id: int
    period_from: date
    period_to: date
    market_rent: Optional[float] = None
    cost_center: Optional[str] = None

    @field_validator('market_rent')
    @classmethod
    def v_rent(cls, v): return validate_positive_float(v, "Market rent")

    @model_validator(mode='after')
    def v_dates(self):
        validate_date_range(self.period_from, self.period_to, "Period from", "Period to")
        return self

class VacancyOut(VacancyCreate):
    id: int
    posted: bool
    reversed: bool
    created_at: datetime
    class Config: from_attributes = True

@router.get("/vacancy-postings")
def list_vacancies(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    ro_ids = db.query(RentalObject.id).join(Building).filter(Building.business_entity_id.in_(be_ids)) if be_ids else []
    return db.query(VacancyPosting)        .filter(VacancyPosting.rental_object_id.in_(ro_ids))        .options(joinedload(VacancyPosting.rental_object))        .order_by(VacancyPosting.period_from.desc()).all()

@router.post("/vacancy-postings", response_model=VacancyOut)
def create_vacancy(data: VacancyCreate, db: Session = Depends(get_db), u=Depends(require_permission("create")), org=Depends(get_current_org)):
    obj = VacancyPosting(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_vacancy_postings", obj.id)
    return obj

@router.put("/vacancy-postings/{id}", response_model=VacancyOut)
def update_vacancy(id: int, data: VacancyCreate, db: Session = Depends(get_db), u=Depends(require_permission("update")), org=Depends(get_current_org)):
    obj = db.query(VacancyPosting).filter(VacancyPosting.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    if obj.posted: raise HTTPException(400, "Cannot edit a posted vacancy. Reverse it first.")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_vacancy_postings", id)
    return obj

@router.patch("/vacancy-postings/{id}/reverse")
def reverse_vacancy(id: int, db: Session = Depends(get_db), u=Depends(require_permission("update")), org=Depends(get_current_org)):
    obj = db.query(VacancyPosting).filter(VacancyPosting.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    obj.reversed = True
    db.commit()
    audit(db, u, "UPDATE", "re_vacancy_postings", id)
    return {"ok": True}

@router.delete("/vacancy-postings/{id}")
def delete_vacancy(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    obj = db.query(VacancyPosting).filter(VacancyPosting.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    if obj.posted and not obj.reversed:
        raise HTTPException(400, "Cannot delete a posted vacancy. Reverse it first.")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_vacancy_postings", id)
    return {"ok": True}


# ── SALES DECLARATIONS ────────────────────────────────────────────────────────

class SalesDeclarationCreate(BaseModel):
    contract_id: int
    sales_rule_id: int
    rental_object_id: Optional[int] = None
    period_from: date
    period_to: date
    declared_amount: float
    sales_category: Optional[str] = None

    @field_validator('declared_amount')
    @classmethod
    def v_amount(cls, v):
        if v < 0: raise ValueError("Declared amount cannot be negative")
        return v

    @model_validator(mode='after')
    def v_dates(self):
        validate_date_range(self.period_from, self.period_to, "Period from", "Period to")
        return self

class SalesDeclarationOut(SalesDeclarationCreate):
    id: int
    calculated_rent: Optional[float] = None
    posted: bool
    posted_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    class Config: from_attributes = True

@router.get("/sales-declarations")
def list_sales_declarations(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    cids = db.query(Contract.id).filter(Contract.business_entity_id.in_(be_ids)) if be_ids else []
    return db.query(SalesDeclaration)        .filter(SalesDeclaration.contract_id.in_(cids))        .options(joinedload(SalesDeclaration.contract), joinedload(SalesDeclaration.sales_rule))        .order_by(SalesDeclaration.period_from.desc()).all()

@router.post("/sales-declarations", response_model=SalesDeclarationOut)
def create_sales_declaration(data: SalesDeclarationCreate, db: Session = Depends(get_db), u=Depends(require_permission("create")), org=Depends(get_current_org)):
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    contract = db.query(Contract).filter(Contract.id == data.contract_id, Contract.business_entity_id.in_(be_ids)).first()
    if not contract: raise HTTPException(404, "Contract not found")
    # Calculate rent from sales rule
    rule = db.query(SalesRule).filter(SalesRule.id == data.sales_rule_id).first()
    if not rule: raise HTTPException(404, "Sales rule not found")
    calculated = float(data.declared_amount) * (rule.rate_pct or 0) / 100
    if rule.min_rent: calculated = max(calculated, float(rule.min_rent))
    if rule.max_rent: calculated = min(calculated, float(rule.max_rent))
    obj = SalesDeclaration(**data.dict(), calculated_rent=calculated)
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "re_sales_declarations", obj.id)
    return obj

@router.put("/sales-declarations/{id}", response_model=SalesDeclarationOut)
def update_sales_declaration(id: int, data: SalesDeclarationCreate, db: Session = Depends(get_db), u=Depends(require_permission("update")), org=Depends(get_current_org)):
    obj = db.query(SalesDeclaration).filter(SalesDeclaration.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    if obj.posted: raise HTTPException(400, "Cannot edit a posted declaration.")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "re_sales_declarations", id)
    return obj

@router.delete("/sales-declarations/{id}")
def delete_sales_declaration(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    obj = db.query(SalesDeclaration).filter(SalesDeclaration.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    if obj.posted: raise HTTPException(400, "Cannot delete a posted declaration.")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "re_sales_declarations", id)
    return {"ok": True}

@router.get("/sales-rules")
def list_sales_rules(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    cids = db.query(Contract.id).filter(Contract.business_entity_id.in_(be_ids)) if be_ids else []
    return db.query(SalesRule).join(Condition).filter(Condition.contract_id.in_(cids)).all()
