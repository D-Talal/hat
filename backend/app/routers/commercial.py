from fastapi import APIRouter, Depends, HTTPException, Query
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
    usage_type:  Optional[str] = None
    cost_center: Optional[str] = None
    im_key:      Optional[str] = None
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
    space_ids: Optional[List[int]] = []

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
    space_id: Optional[int] = None
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
    assigned = [co.space_id for co in db.query(ContractObject).filter(ContractObject.valid_to == None).all()]
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
    ro_count = db.query(ContractObject).filter(ContractObject.space_id == id, ContractObject.valid_to == None).count()
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
        joinedload(Contract.contract_objects).joinedload(ContractObject.space),
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
    space_ids = data.space_ids or []
    payload = data.dict(exclude={"space_ids"})
    if not payload.get("contract_number"):
        count = db.query(Contract).count()
        payload["contract_number"] = f"LO-{count + 1:05d}"
    obj = Contract(**payload)
    db.add(obj); db.flush()
    for sid in space_ids:
        db.add(ContractObject(contract_id=obj.id, space_id=sid, valid_from=data.start_date))
        # Mark space as occupied
        sp = db.query(Space).filter(Space.id == sid).first()
        if sp: sp.status = SpaceStatus.occupied
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


# ── CONTRACT ACTIONS ──────────────────────────────────────────────────────────

@router.post("/contracts/{id}/terminate")
def terminate_contract(
    id: int,
    notice_date:    date = Query(..., description="Date the termination notice was given"),
    effective_date: date = Query(..., description="Date the contract effectively ends"),
    create_vacancy: bool = Query(True, description="Create a vacancy posting for freed spaces"),
    market_rent:    Optional[float] = Query(None, description="Market rent per sqm/year for vacancy posting"),
    reason:         Optional[str] = Query(None, description="Termination reason"),
    db: Session = Depends(get_db),
    u=Depends(require_permission("update")),
):
    """
    Formal contract termination workflow:
    - Sets contract status to 'terminated'
    - Records notice + effective dates
    - Closes contract-object links (valid_to = effective_date)
    - Closes active conditions (valid_to = effective_date)
    - Frees the spaces (status → vacant)
    - Optionally creates vacancy postings for the freed spaces
    """
    from sqlalchemy import or_

    contract = db.query(Contract).options(
        joinedload(Contract.business_partner),
        joinedload(Contract.business_entity),
        joinedload(Contract.contract_objects).joinedload(ContractObject.space),
    ).filter(Contract.id == id).first()
    if not contract:
        raise HTTPException(404, "Contract not found")
    if contract.status != ContractStatus.released:
        raise HTTPException(400, f"Only Released contracts can be terminated (current: {contract.status.value})")
    if effective_date < notice_date:
        raise HTTPException(400, "Effective date cannot be before notice date")

    # 1. Update contract
    contract.status = ContractStatus.terminated
    contract.notice_date = notice_date
    contract.absolute_end_date = effective_date
    if reason:
        contract.notes = ((contract.notes or "") + f"\n[Résiliation {effective_date}] {reason}").strip()

    freed_spaces = []
    # 2. Close contract-object links + free spaces
    for co in contract.contract_objects:
        if co.valid_to is None or co.valid_to > effective_date:
            co.valid_to = effective_date
        sp = co.space
        if sp:
            sp.status = SpaceStatus.vacant
            freed_spaces.append(sp)

    # 3. Close active conditions
    conditions = db.query(Condition).filter(
        Condition.contract_id == id,
        or_(Condition.valid_to.is_(None), Condition.valid_to > effective_date),
    ).all()
    for cond in conditions:
        cond.valid_to = effective_date

    # 4. Optionally create vacancy postings
    vacancies_created = []
    if create_vacancy and freed_spaces:
        from datetime import timedelta
        vac_start = effective_date + timedelta(days=1)
        # default vacancy window: until end of the year (or 90 days)
        vac_end = vac_start + timedelta(days=90)
        for sp in freed_spaces:
            vp = VacancyPosting(
                space_id=sp.id,
                period_from=vac_start,
                period_to=vac_end,
                market_rent=market_rent,
                posted=False,
                reversed=False,
            )
            db.add(vp)
            vacancies_created.append(sp.space_code)

    db.commit()
    db.refresh(contract)
    audit(db, u, "UPDATE", "re_contracts", id, f"terminated effective={effective_date}")
    return {
        "contract_id": id,
        "contract_number": contract.contract_number,
        "status": "terminated",
        "notice_date": str(notice_date),
        "effective_date": str(effective_date),
        "spaces_freed": [s.space_code for s in freed_spaces],
        "conditions_closed": len(conditions),
        "vacancy_postings_created": vacancies_created,
        "message": f"Contrat résilié au {effective_date} — {len(freed_spaces)} espace(s) libéré(s)",
    }


@router.post("/contracts/{id}/renew", response_model=ContractOut)
def renew_contract(
    id: int,
    new_start_date: Optional[date] = Query(None, description="Start of the renewed contract (default: day after current end)"),
    new_end_date:   Optional[date] = Query(None, description="Absolute end of the renewed contract (default: same duration as original)"),
    copy_conditions: bool = Query(True, description="Clone the conditions (rents, charges) onto the new contract"),
    db: Session = Depends(get_db),
    u=Depends(require_permission("create")),
):
    """
    Renew a contract by cloning it into a new Draft contract.

    - The new contract starts the day after the source's end date (or a supplied date).
    - Same business partner, business entity, spaces, and contract settings.
    - Conditions are cloned with their validity shifted to the new period.
    - The new contract is created as Draft so it can be reviewed before release.
    - The source contract is left untouched.
    """
    from datetime import timedelta
    import calendar

    def _add_months(d: date, months: int) -> date:
        """Add a number of months to a date, clamping the day to month length."""
        total = (d.year * 12 + (d.month - 1)) + months
        y, m = divmod(total, 12)
        m += 1
        last_day = calendar.monthrange(y, m)[1]
        return date(y, m, min(d.day, last_day))

    source = db.query(Contract).options(
        joinedload(Contract.conditions),
        joinedload(Contract.contract_objects),
    ).filter(Contract.id == id).first()
    if not source:
        raise HTTPException(404, "Contract not found")

    # Determine the anchor end date of the source
    source_end = source.absolute_end_date or source.probable_end_date or source.first_end_date
    if not source_end and not new_start_date:
        raise HTTPException(400, "Source contract has no end date; please supply new_start_date explicitly.")

    # New start: supplied, else day after source end
    start = new_start_date or (source_end + timedelta(days=1))

    # New end: supplied, else mirror the original duration (in whole months)
    if new_end_date:
        end = new_end_date
    elif source.start_date and source_end:
        months_span = (source_end.year - source.start_date.year) * 12 + (source_end.month - source.start_date.month)
        end = _add_months(start, months_span)
    else:
        end = None

    if end and end < start:
        raise HTTPException(400, "New end date cannot be before the new start date.")

    # Generate a fresh contract number
    count = db.query(Contract).count()
    prefix = "LI" if source.contract_type == ContractType.lease_in else "LO"
    new_number = f"{prefix}-{count + 1:05d}"

    # Clone the contract (Draft status, new dates, new number)
    renewed = Contract(
        contract_number=new_number,
        business_partner_id=source.business_partner_id,
        business_entity_id=source.business_entity_id,
        contract_type=source.contract_type,
        status=ContractStatus.draft,
        start_date=start,
        first_end_date=end,
        probable_end_date=end,
        absolute_end_date=end,
        signing_date=date.today(),
        relevant_to_sales=source.relevant_to_sales,
        is_multi_object=source.is_multi_object,
        payment_timing=source.payment_timing,
        day_count_method=source.day_count_method,
        pro_rata_enabled=source.pro_rata_enabled,
        notes=f"[Renouvellement de {source.contract_number}]" + (f"\n{source.notes}" if source.notes else ""),
    )
    db.add(renewed)
    db.flush()

    # Clone contract objects (spaces), validity starting at the new start
    for co in source.contract_objects:
        db.add(ContractObject(
            contract_id=renewed.id,
            space_id=co.space_id,
            valid_from=start,
            valid_to=end,
            object_group=co.object_group,
        ))

    # Clone conditions, shifting validity into the new period
    cloned_conditions = 0
    if copy_conditions:
        for c in source.conditions:
            db.add(Condition(
                contract_id=renewed.id,
                condition_type=c.condition_type,
                condition_code=c.condition_code,
                valid_from=start,
                valid_to=end,
                amount=c.amount,
                currency=c.currency,
                frequency=c.frequency,
                payment_timing=c.payment_timing,
                ipc_enabled=c.ipc_enabled,
                ipc_base_index=c.ipc_base_index,
                ipc_reference_date=c.ipc_reference_date,
                is_flat_rate=c.is_flat_rate,
                markup_rate=c.markup_rate,
                notes=c.notes,
            ))
            cloned_conditions += 1

    db.commit()
    db.refresh(renewed)
    audit(db, u, "CREATE", "re_contracts", renewed.id,
          f"renewed from {source.contract_number} ({cloned_conditions} conditions)")
    return renewed


@router.post("/contracts/{id}/generate-invoices")
def generate_invoices_for_contract(
    id: int,
    period_from: date = Query(..., description="Start of billing period"),
    period_to:   date = Query(..., description="End of billing period"),
    db: Session = Depends(get_db),
    u=Depends(require_permission("create")),
):
    """
    Quittancement automatique — génère les appels de loyer pour un contrat
    sur la période donnée, en se basant sur ses conditions actives.
    Évite les doublons en vérifiant les invoices déjà existantes.
    """
    from decimal import Decimal, ROUND_HALF_UP
    from sqlalchemy import or_

    contract = db.query(Contract).options(
        joinedload(Contract.business_entity),
        joinedload(Contract.business_partner),
    ).filter(Contract.id == id).first()
    if not contract:
        raise HTTPException(404, "Contract not found")
    if contract.status != ContractStatus.released:
        raise HTTPException(400, f"Contract must be Released to generate invoices (current: {contract.status.value})")

    # Get active conditions for this period
    conditions = db.query(Condition).filter(
        Condition.contract_id == id,
        Condition.valid_from <= period_to,
        or_(Condition.valid_to.is_(None), Condition.valid_to >= period_from),
        Condition.amount.isnot(None),
        Condition.amount > 0,
    ).all()

    if not conditions:
        raise HTTPException(400, "No active conditions found for this period")

    freq_mult = {"monthly": 12, "quarterly": 4, "semi_annual": 2, "annual": 1}
    created = []
    skipped = []

    for cond in conditions:
        # Check for existing invoice for this condition+period (avoid duplicates)
        existing = db.query(Invoice).filter(
            Invoice.contract_id == id,
            Invoice.condition_type == cond.condition_type,
            Invoice.period_from == period_from,
            Invoice.period_to == period_to,
        ).first()
        if existing:
            skipped.append({"condition_type": cond.condition_type.value, "reason": "already_exists", "invoice_id": existing.id})
            continue

        # Calculate amount pro-rata
        freq = cond.frequency.value if hasattr(cond.frequency, 'value') else (cond.frequency or "monthly")
        n = freq_mult.get(freq, 12)
        annual = Decimal(str(cond.amount)) * Decimal(str(n))

        # Pro-rata calculation
        total_days_in_month = (period_to - period_from).days + 1
        import calendar
        days_in_month = calendar.monthrange(period_from.year, period_from.month)[1]
        if total_days_in_month == days_in_month:
            amount = (annual / Decimal(12)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        else:
            amount = (annual / Decimal(365) * Decimal(total_days_in_month)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Due date: in_advance = first day of period, in_arrears = last day
        payment_timing = cond.payment_timing.value if hasattr(cond.payment_timing, 'value') else "in_advance"
        due_date = period_from if payment_timing == "in_advance" else period_to

        currency = cond.currency or (contract.business_entity.currency if contract.business_entity else "USD") or "USD"

        invoice = Invoice(
            contract_id=id,
            condition_type=cond.condition_type,
            amount=amount,
            currency=currency,
            due_date=due_date,
            period_from=period_from,
            period_to=period_to,
            status="pending",
            description=f"{cond.condition_type.value.replace('_', ' ').title()} — {period_from.strftime('%B %Y')}",
            is_catch_up=False,
        )
        db.add(invoice)
        created.append({
            "condition_type": cond.condition_type.value,
            "amount": float(amount),
            "currency": currency,
            "due_date": str(due_date),
        })

    db.commit()
    audit(db, u, "CREATE", "re_invoices", id, f"bulk_generate period={period_from}:{period_to} count={len(created)}")
    return {
        "contract_id": id,
        "contract_number": contract.contract_number,
        "period_from": str(period_from),
        "period_to": str(period_to),
        "created": created,
        "skipped": skipped,
        "total_created": len(created),
        "total_skipped": len(skipped),
    }


@router.post("/contracts/{id}/apply-ipc")
def trigger_ipc_revision(
    id: int,
    new_index: float = Query(..., description="New IPC index value (e.g. 115.3)"),
    applied_date: date = Query(..., description="Date from which the new index applies"),
    db: Session = Depends(get_db),
    u=Depends(require_permission("update")),
):
    """
    Déclenche une révision IPC sur toutes les conditions ipc_enabled du contrat.
    Crée de nouvelles conditions avec le montant révisé et ferme les anciennes.
    """
    contract = db.query(Contract).filter(Contract.id == id).first()
    if not contract:
        raise HTTPException(404, "Contract not found")
    if contract.status != ContractStatus.released:
        raise HTTPException(400, "Contract must be Released to apply IPC revision")

    # Check there are IPC-enabled conditions
    from sqlalchemy import or_
    ipc_conditions = db.query(Condition).filter(
        Condition.contract_id == id,
        Condition.ipc_enabled == True,
        or_(Condition.valid_to.is_(None), Condition.valid_to >= applied_date),
    ).all()
    if not ipc_conditions:
        raise HTTPException(400, "No IPC-enabled conditions found on this contract. Enable IPC on at least one condition first.")

    from app.services.posting_engine import apply_ipc
    history = apply_ipc(db, id, new_index, applied_date)

    audit(db, u, "UPDATE", "re_contracts", id, f"ipc_revision index={new_index} date={applied_date}")
    return {
        "contract_id": id,
        "contract_number": contract.contract_number,
        "applied_date": str(applied_date),
        "old_index": float(history.old_index),
        "new_index": float(history.new_index),
        "revision_pct": round(float(history.revision_pct), 2),
        "conditions_updated": len(history.conditions_updated),
        "message": f"IPC revision applied: {round(float(history.revision_pct), 2):+.2f}% — {len(history.conditions_updated)} condition(s) updated",
    }


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

@router.get("/spaces/{space_id}/detail")
def get_space_detail(space_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    """
    Consolidated view of a single space — everything in one call:
    hierarchy, current/historical measurements, active & past contracts,
    conditions, vacancy postings, maintenance requests.
    """
    from sqlalchemy import or_
    space = db.query(Space).options(
        joinedload(Space.floor).joinedload(Floor.building).joinedload(Building.business_entity),
        joinedload(Space.measurements),
    ).filter(Space.id == space_id).first()
    if not space:
        raise HTTPException(404, "Space not found")

    floor    = space.floor
    building = floor.building if floor else None
    be       = building.business_entity if building else None

    st = space.status
    status_str = st.value if hasattr(st, 'value') else (str(st).split('.')[-1] if st else "available")

    # Measurements history (sorted newest first)
    measurements = sorted(space.measurements, key=lambda m: m.valid_from, reverse=True)
    current_m = next((m for m in measurements if not m.valid_to), None)

    # Contract objects linking this space (active + historical)
    contract_objects = db.query(ContractObject).options(
        joinedload(ContractObject.contract).joinedload(Contract.business_partner),
        joinedload(ContractObject.contract).joinedload(Contract.conditions),
    ).filter(ContractObject.space_id == space_id).all()

    today = date.today()
    contracts_out = []
    for co in contract_objects:
        c = co.contract
        if not c:
            continue
        # Is this assignment currently active?
        is_active = (co.valid_from <= today) and (co.valid_to is None or co.valid_to >= today)
        bp = c.business_partner
        # Active conditions for this contract
        conds = [
            {
                "id": cond.id,
                "type": cond.condition_type.value if hasattr(cond.condition_type, 'value') else str(cond.condition_type),
                "amount": float(cond.amount) if cond.amount else 0,
                "currency": cond.currency or "USD",
                "frequency": cond.frequency.value if hasattr(cond.frequency, 'value') else str(cond.frequency),
                "valid_from": str(cond.valid_from),
                "valid_to": str(cond.valid_to) if cond.valid_to else None,
                "ipc_enabled": cond.ipc_enabled,
            }
            for cond in (c.conditions or [])
            if cond.valid_from <= today and (cond.valid_to is None or cond.valid_to >= today)
        ]
        contracts_out.append({
            "contract_id": c.id,
            "contract_number": c.contract_number,
            "status": c.status.value if hasattr(c.status, 'value') else str(c.status),
            "tenant": bp.company_name if bp else None,
            "tenant_id": bp.id if bp else None,
            "co_valid_from": str(co.valid_from),
            "co_valid_to": str(co.valid_to) if co.valid_to else None,
            "is_active": is_active,
            "start_date": str(c.start_date) if c.start_date else None,
            "end_date": str(c.absolute_end_date) if c.absolute_end_date else None,
            "conditions": conds,
        })
    # Active first, then by start desc
    contracts_out.sort(key=lambda x: (not x["is_active"], x["co_valid_from"]), reverse=False)

    # Vacancy postings
    vacancies = db.query(VacancyPosting).filter(
        VacancyPosting.space_id == space_id
    ).order_by(VacancyPosting.period_from.desc()).all()
    vacancies_out = [{
        "id": v.id,
        "period_from": str(v.period_from),
        "period_to": str(v.period_to),
        "market_rent": float(v.market_rent) if v.market_rent else None,
        "posted": v.posted,
        "reversed": v.reversed,
    } for v in vacancies]

    # Maintenance requests
    maint = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.space_id == space_id
    ).order_by(MaintenanceRequest.created_at.desc()).all()
    maint_out = [{
        "id": m.id,
        "title": m.title,
        "priority": m.priority,
        "status": m.status.value if hasattr(m.status, 'value') else str(m.status),
        "created_at": str(m.created_at) if m.created_at else None,
    } for m in maint]

    active_contract = next((c for c in contracts_out if c["is_active"]), None)

    return {
        "space": {
            "id": space.id,
            "space_code": space.space_code,
            "description": space.description,
            "status": status_str,
            "usage_type": space.usage_type,
            "cost_center": space.cost_center,
            "im_key": space.im_key,
        },
        "hierarchy": {
            "floor_id": floor.id if floor else None,
            "floor_number": floor.floor_number if floor else None,
            "floor_name": floor.name if floor else None,
            "building_id": building.id if building else None,
            "building_name": building.name if building else None,
            "business_entity_id": be.id if be else None,
            "business_entity_name": be.name if be else None,
            "city": building.city if building else None,
            "country": building.country if building else None,
        },
        "current_area_sqm": float(current_m.area_sqm) if current_m else None,
        "current_valid_from": str(current_m.valid_from) if current_m else None,
        "measurements": [{
            "id": m.id,
            "area_sqm": float(m.area_sqm),
            "valid_from": str(m.valid_from),
            "valid_to": str(m.valid_to) if m.valid_to else None,
            "note": m.note,
            "is_current": (m.valid_to is None),
        } for m in measurements],
        "active_contract": active_contract,
        "contracts": contracts_out,
        "vacancies": vacancies_out,
        "maintenance": maint_out,
        "summary": {
            "total_contracts": len(contracts_out),
            "has_active_contract": active_contract is not None,
            "total_vacancy_periods": len(vacancies_out),
            "open_maintenance": len([m for m in maint_out if m["status"] != "closed"]),
        },
    }

@router.get("/health/org-integrity")
def org_integrity_check(db: Session = Depends(get_db), u=Depends(get_current_user)):
    """
    Health check — counts orphaned (NULL org_id) rows across the data model.
    After the backfill migration these should all be 0.
    """
    orphan_cc = db.query(CompanyCode).filter(CompanyCode.org_id == None).count()
    orphan_be = db.query(BusinessEntity).filter(BusinessEntity.org_id == None).count()
    orphan_bp = db.query(BusinessPartner).filter(BusinessPartner.org_id == None).count()
    # Buildings whose business_entity is missing or has null org
    orphan_buildings = db.query(Building).outerjoin(
        BusinessEntity, BusinessEntity.id == Building.business_entity_id
    ).filter((BusinessEntity.id == None) | (BusinessEntity.org_id == None)).count()
    # Spaces whose chain is broken
    orphan_spaces = db.query(Space).outerjoin(Floor, Floor.id == Space.floor_id)\
        .outerjoin(Building, Building.id == Floor.building_id)\
        .outerjoin(BusinessEntity, BusinessEntity.id == Building.business_entity_id)\
        .filter((BusinessEntity.id == None) | (BusinessEntity.org_id == None)).count()
    total = orphan_cc + orphan_be + orphan_bp + orphan_buildings + orphan_spaces
    return {
        "healthy": total == 0,
        "orphaned": {
            "company_codes": orphan_cc,
            "business_entities": orphan_be,
            "business_partners": orphan_bp,
            "buildings": orphan_buildings,
            "spaces": orphan_spaces,
        },
        "total_orphaned": total,
        "message": "All data correctly scoped to an organization." if total == 0
                   else f"{total} orphaned row(s) found — they will be backfilled on next backend restart.",
    }

@router.get("/spaces-leasable")
def list_leasable_spaces(business_entity_id: Optional[int] = None, building_id: Optional[int] = None, db: Session = Depends(get_db), u=Depends(get_current_user)):
    """List spaces with full hierarchy info."""
    q = db.query(Space)        .join(Floor, Floor.id == Space.floor_id)        .join(Building, Building.id == Floor.building_id)        .outerjoin(BusinessEntity, BusinessEntity.id == Building.business_entity_id)        .options(
            joinedload(Space.floor).joinedload(Floor.building).joinedload(Building.business_entity),
            joinedload(Space.measurements)
        )
    if u.organization_id:
        q = q.filter(
            (BusinessEntity.org_id == u.organization_id) |
            (BusinessEntity.org_id == None) |
            (BusinessEntity.id == None)
        )
    if business_entity_id:
        q = q.filter(Building.business_entity_id == business_entity_id)
    if building_id:
        q = q.filter(Floor.building_id == building_id)
    results = []
    for s in q.all():
        current = next((m for m in sorted(s.measurements, key=lambda m: m.valid_from, reverse=True) if not m.valid_to), None)
        st = s.status
        status_str = st.value if hasattr(st, 'value') else (str(st).split('.')[-1] if st else "available")
        results.append({
            "id": s.id,
            "space_code": s.space_code,
            "description": s.description,
            "status": status_str,
            "usage_type": s.usage_type,
            "cost_center": s.cost_center,
            "im_key": s.im_key,
            "current_area_sqm": float(current.area_sqm) if current else None,
            "floor_id": s.floor_id,
            "floor_number": s.floor.floor_number if s.floor else None,
            "floor_name": s.floor.name if s.floor else None,
            "building_id": s.floor.building_id if s.floor else None,
            "building_name": s.floor.building.name if s.floor and s.floor.building else None,
            "business_entity_id": s.floor.building.business_entity_id if s.floor and s.floor.building else None,
            "business_entity_name": s.floor.building.business_entity.name if s.floor and s.floor.building and s.floor.building.business_entity else None,
        })
    return results

@router.get("/buildings/{building_id}/contract-objects")
def list_contract_objects_for_building(building_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    cos = db.query(ContractObject).options(
        joinedload(ContractObject.contract).joinedload(Contract.business_partner),
        joinedload(ContractObject.space)
    ).join(Space).join(Floor).filter(Floor.building_id == building_id).all()
    return [{"id": co.id, "contract": {"id": co.contract.id, "contract_number": co.contract.contract_number}, "space": {"id": co.space.id, "space_code": co.space.space_code}} for co in cos]


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
    total_objects    = db.query(Space).count()
    occupied         = db.query(Space).filter(Space.status == SpaceStatus.occupied).count()
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
    space_id: int
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
    if not be_ids:
        return []
    space_ids = [r[0] for r in db.query(Space.id).join(Floor).join(Building).filter(Building.business_entity_id.in_(be_ids)).all()]
    if not space_ids:
        return []
    return db.query(VacancyPosting)\
        .filter(VacancyPosting.space_id.in_(space_ids))\
        .options(joinedload(VacancyPosting.space))\
        .order_by(VacancyPosting.period_from.desc()).all()

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
    space_id: Optional[int] = None
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
