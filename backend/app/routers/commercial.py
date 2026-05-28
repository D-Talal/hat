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
    BusinessEntity, Building, Floor, Space, SpaceMeasurement,
    RentalObject, RentalObjectSpace,
    BusinessPartner, BusinessPartnerRole,
    Contract, ContractDateSlot, ContractObject,
    Condition, SalesRule, SalesDeclaration,
    ParticipationGroup, ParticipationGroupMember, SettlementUnit, CostCollector,
    DepositContract, VacancyPosting, Invoice, MaintenanceRequest,
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
    legal_name: Optional[str] = None
    tax_id: Optional[str] = None
    country: Optional[str] = None
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
    city: Optional[str] = None
    country: Optional[str] = None
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
    city: Optional[str] = None
    country: Optional[str] = None
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
    building_id: int
    code: str
    description: Optional[str] = None
    usage_type: Optional[str] = "retail"
    status: Optional[str] = "available"
    cost_center: Optional[str] = None
    im_key: Optional[str] = None

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
    space_ids: Optional[List[int]] = []

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

def _space_with_area(space):
    current = next(
        (m for m in sorted(space.measurements, key=lambda m: m.valid_from, reverse=True) if not m.valid_to),
        None
    )
    d = {c.name: getattr(space, c.name) for c in space.__table__.columns}
    d["current_area_sqm"] = current.area_sqm if current else None
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
        db.add(SpaceMeasurement(space_id=obj.id, **data.initial_measurement.dict()))
    db.commit()
    audit(db, u, "UPDATE", "re_spaces", id)
    return _space_with_area(obj)

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
        joinedload(Contract.business_partner).joinedload(BusinessPartner.roles)
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
    obj = db.query(Contract).filter(Contract.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
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

@router.get("/rental-objects")
def list_rental_objects(building_id: Optional[int] = None, db: Session = Depends(get_db), u=Depends(get_current_user)):
    q = db.query(RentalObject).options(
        joinedload(RentalObject.building),
        joinedload(RentalObject.spaces).joinedload(RentalObjectSpace.space).joinedload(Space.measurements)
    )
    if building_id: q = q.filter(RentalObject.building_id == building_id)
    results = []
    for ro in q.all():
        d = {c.name: getattr(ro, c.name) for c in ro.__table__.columns}
        d["building"] = {"id": ro.building.id, "name": ro.building.name} if ro.building else None
        d["spaces"] = []
        for ros in ro.spaces:
            s = ros.space
            current = next((m for m in sorted(s.measurements, key=lambda m: m.valid_from, reverse=True) if not m.valid_to), None)
            d["spaces"].append({"id": s.id, "space_code": s.space_code, "current_area_sqm": current.area_sqm if current else None})
        results.append(d)
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
    for k, v in data.dict(exclude={"space_ids"}).items(): setattr(obj, k, v)
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

@router.delete("/participation-groups/{id}")
def delete_participation_group(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(ParticipationGroup).filter(ParticipationGroup.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}


# ── COST COLLECTORS ───────────────────────────────────────────────────────────

@router.post("/cost-collectors", response_model=CostCollectorOut)
def create_cost_collector(data: CostCollectorCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    payload = data.dict(exclude={"participation_group_id"})
    if not payload.get("settlement_unit_id") and data.participation_group_id:
        su = db.query(SettlementUnit).filter(SettlementUnit.participation_group_id == data.participation_group_id).first()
        if su: payload["settlement_unit_id"] = su.id
    obj = CostCollector(**payload)
    db.add(obj); db.commit(); db.refresh(obj); return obj

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
