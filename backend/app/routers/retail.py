from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models.retail import Property, Unit, Tenant, Invoice, MaintenanceRequest
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

router = APIRouter()

# --- Schemas ---
class PropertyCreate(BaseModel):
    name: str
    address: Optional[str] = None
    total_area_sqft: Optional[float] = None

class PropertyOut(PropertyCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class UnitCreate(BaseModel):
    property_id: int
    unit_number: str
    floor: Optional[int] = None
    area_sqft: Optional[float] = None
    unit_type: Optional[str] = None
    status: Optional[str] = "available"
    monthly_rent: Optional[float] = None

class UnitOut(UnitCreate):
    id: int
    class Config: from_attributes = True

class TenantCreate(BaseModel):
    unit_id: int
    business_name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    lease_start: Optional[date] = None
    lease_end: Optional[date] = None
    lease_status: Optional[str] = "active"
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None

class TenantOut(TenantCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class InvoiceCreate(BaseModel):
    tenant_id: int
    amount: float
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: Optional[str] = "pending"
    description: Optional[str] = None

class InvoiceOut(InvoiceCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class MaintenanceCreate(BaseModel):
    unit_id: int
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "open"
    reported_by: Optional[str] = None

class MaintenanceOut(MaintenanceCreate):
    id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None
    class Config: from_attributes = True

# --- Properties ---
@router.get("/properties", response_model=List[PropertyOut])
def list_properties(db: Session = Depends(get_db)):
    return db.query(Property).all()

@router.post("/properties", response_model=PropertyOut)
def create_property(data: PropertyCreate, db: Session = Depends(get_db)):
    obj = Property(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/properties/{id}", response_model=PropertyOut)
def update_property(id: int, data: PropertyCreate, db: Session = Depends(get_db)):
    obj = db.query(Property).filter(Property.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/properties/{id}")
def delete_property(id: int, db: Session = Depends(get_db)):
    obj = db.query(Property).filter(Property.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

# --- Units ---
@router.get("/units", response_model=List[UnitOut])
def list_units(property_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Unit)
    if property_id: q = q.filter(Unit.property_id == property_id)
    return q.all()

@router.post("/units", response_model=UnitOut)
def create_unit(data: UnitCreate, db: Session = Depends(get_db)):
    obj = Unit(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.put("/units/{id}", response_model=UnitOut)
def update_unit(id: int, data: UnitCreate, db: Session = Depends(get_db)):
    obj = db.query(Unit).filter(Unit.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/units/{id}")
def delete_unit(id: int, db: Session = Depends(get_db)):
    obj = db.query(Unit).filter(Unit.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

# --- Tenants ---
@router.get("/tenants", response_model=List[TenantOut])
def list_tenants(db: Session = Depends(get_db)):
    return db.query(Tenant).all()

@router.post("/tenants", response_model=TenantOut)
def create_tenant(data: TenantCreate, db: Session = Depends(get_db)):
    obj = Tenant(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.put("/tenants/{id}", response_model=TenantOut)
def update_tenant(id: int, data: TenantCreate, db: Session = Depends(get_db)):
    obj = db.query(Tenant).filter(Tenant.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/tenants/{id}")
def delete_tenant(id: int, db: Session = Depends(get_db)):
    obj = db.query(Tenant).filter(Tenant.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

# --- Invoices ---
@router.get("/invoices", response_model=List[InvoiceOut])
def list_invoices(tenant_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Invoice)
    if tenant_id: q = q.filter(Invoice.tenant_id == tenant_id)
    return q.all()

@router.post("/invoices", response_model=InvoiceOut)
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db)):
    obj = Invoice(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.put("/invoices/{id}", response_model=InvoiceOut)
def update_invoice(id: int, data: InvoiceCreate, db: Session = Depends(get_db)):
    obj = db.query(Invoice).filter(Invoice.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/invoices/{id}")
def delete_invoice(id: int, db: Session = Depends(get_db)):
    obj = db.query(Invoice).filter(Invoice.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

# --- Maintenance ---
@router.get("/maintenance", response_model=List[MaintenanceOut])
def list_maintenance(db: Session = Depends(get_db)):
    return db.query(MaintenanceRequest).all()

@router.post("/maintenance", response_model=MaintenanceOut)
def create_maintenance(data: MaintenanceCreate, db: Session = Depends(get_db)):
    obj = MaintenanceRequest(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.put("/maintenance/{id}", response_model=MaintenanceOut)
def update_maintenance(id: int, data: MaintenanceCreate, db: Session = Depends(get_db)):
    obj = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/maintenance/{id}")
def delete_maintenance(id: int, db: Session = Depends(get_db)):
    obj = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

# --- Dashboard Stats ---
@router.get("/stats")
def retail_stats(db: Session = Depends(get_db)):
    total_units = db.query(Unit).count()
    occupied = db.query(Unit).filter(Unit.status == "occupied").count()
    total_tenants = db.query(Tenant).filter(Tenant.lease_status == "active").count()
    pending_invoices = db.query(Invoice).filter(Invoice.status == "pending").count()
    open_maintenance = db.query(MaintenanceRequest).filter(MaintenanceRequest.status == "open").count()
    monthly_revenue = db.query(func.sum(Tenant.monthly_rent)).filter(Tenant.lease_status == "active").scalar() or 0
    return {
        "total_units": total_units,
        "occupied_units": occupied,
        "occupancy_rate": round((occupied / total_units * 100) if total_units else 0, 1),
        "active_tenants": total_tenants,
        "pending_invoices": pending_invoices,
        "open_maintenance": open_maintenance,
        "monthly_revenue": monthly_revenue,
    }
