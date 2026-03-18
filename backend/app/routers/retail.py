from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime
from app.database import get_db
from app.models.retail import Property, Unit, Tenant, Invoice, MaintenanceRequest
from app.models.audit import AuditLog
from app.core.deps import get_current_user
from app.core.permissions import require_permission

router = APIRouter()

def audit(db, user, action, resource, rid=None, details=None):
    db.add(AuditLog(user_id=user.id, user_email=user.email, action=action,
                    resource=resource, resource_id=rid, details=details))
    db.commit()

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

def sync_unit_status(db, unit_id):
    """Sync unit status based on active tenants."""
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        return
    active_tenant = db.query(Tenant).filter(
        Tenant.unit_id == unit_id,
        Tenant.lease_status == "active"
    ).first()
    if active_tenant and unit.status != "maintenance":
        unit.status = "occupied"
    elif not active_tenant and unit.status == "occupied":
        unit.status = "available"
    db.commit()

# --- Properties ---
@router.get("/properties", response_model=List[PropertyOut])
def list_properties(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.query(Property).all()

@router.post("/properties", response_model=PropertyOut)
def create_property(data: PropertyCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = Property(**data.dict()); db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "retail_properties", obj.id); return obj

@router.put("/properties/{id}", response_model=PropertyOut)
def update_property(id: int, data: PropertyCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Property).filter(Property.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); audit(db, u, "UPDATE", "retail_properties", id); return obj

@router.delete("/properties/{id}")
def delete_property(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Property).filter(Property.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); audit(db, u, "DELETE", "retail_properties", id); return {"ok": True}

# --- Units ---
@router.get("/units", response_model=List[UnitOut])
def list_units(property_id: Optional[int] = None, db: Session = Depends(get_db), u=Depends(get_current_user)):
    q = db.query(Unit)
    if property_id: q = q.filter(Unit.property_id == property_id)
    return q.all()

@router.post("/units", response_model=UnitOut)
def create_unit(data: UnitCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = Unit(**data.dict()); db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "retail_units", obj.id); return obj

@router.put("/units/{id}", response_model=UnitOut)
def update_unit(id: int, data: UnitCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Unit).filter(Unit.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/units/{id}")
def delete_unit(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Unit).filter(Unit.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

# --- Tenants ---
@router.get("/tenants", response_model=List[TenantOut])
def list_tenants(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.query(Tenant).all()

@router.post("/tenants", response_model=TenantOut)
def create_tenant(data: TenantCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = Tenant(**data.dict()); db.add(obj); db.commit(); db.refresh(obj)
    sync_unit_status(db, obj.unit_id)
    audit(db, u, "CREATE", "retail_tenants", obj.id); return obj

@router.put("/tenants/{id}", response_model=TenantOut)
def update_tenant(id: int, data: TenantCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Tenant).filter(Tenant.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    sync_unit_status(db, obj.unit_id)
    return obj

@router.delete("/tenants/{id}")
def delete_tenant(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Tenant).filter(Tenant.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    unit_id = obj.unit_id
    db.delete(obj); db.commit()
    sync_unit_status(db, unit_id)
    return {"ok": True}

# --- Invoices ---
@router.get("/invoices", response_model=List[InvoiceOut])
def list_invoices(tenant_id: Optional[int] = None, db: Session = Depends(get_db), u=Depends(get_current_user)):
    q = db.query(Invoice)
    if tenant_id: q = q.filter(Invoice.tenant_id == tenant_id)
    return q.all()

@router.post("/invoices", response_model=InvoiceOut)
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db), u=Depends(get_current_user)):
    from app.core.permissions import can
    if not can(u.role, "create") and not can(u.role, "create_invoice"):
        raise HTTPException(403, "Permission denied")
    obj = Invoice(**data.dict()); db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "retail_invoices", obj.id); return obj

@router.put("/invoices/{id}", response_model=InvoiceOut)
def update_invoice(id: int, data: InvoiceCreate, db: Session = Depends(get_db), u=Depends(get_current_user)):
    from app.core.permissions import can
    if not can(u.role, "update") and not can(u.role, "update_invoice"):
        raise HTTPException(403, "Permission denied")
    obj = db.query(Invoice).filter(Invoice.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/invoices/{id}")
def delete_invoice(id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    from app.core.permissions import can
    if not can(u.role, "delete") and not can(u.role, "delete_invoice"):
        raise HTTPException(403, "Permission denied")
    obj = db.query(Invoice).filter(Invoice.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

# --- Maintenance ---
@router.get("/maintenance", response_model=List[MaintenanceOut])
def list_maintenance(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.query(MaintenanceRequest).all()

@router.post("/maintenance", response_model=MaintenanceOut)
def create_maintenance(data: MaintenanceCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = MaintenanceRequest(**data.dict()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.put("/maintenance/{id}", response_model=MaintenanceOut)
def update_maintenance(id: int, data: MaintenanceCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/maintenance/{id}")
def delete_maintenance(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

# --- Stats ---
@router.get("/stats")
def retail_stats(db: Session = Depends(get_db), u=Depends(get_current_user)):
    total_units = db.query(Unit).count()
    occupied = db.query(Unit).filter(Unit.status == "occupied").count()
    total_tenants = db.query(Tenant).filter(Tenant.lease_status == "active").count()
    pending_invoices = db.query(Invoice).filter(Invoice.status == "pending").count()
    open_maintenance = db.query(MaintenanceRequest).filter(MaintenanceRequest.status == "open").count()
    monthly_revenue = db.query(func.sum(Tenant.monthly_rent)).filter(Tenant.lease_status == "active").scalar() or 0
    return {
        "total_units": total_units, "occupied_units": occupied,
        "occupancy_rate": round((occupied / total_units * 100) if total_units else 0, 1),
        "active_tenants": total_tenants, "pending_invoices": pending_invoices,
        "open_maintenance": open_maintenance, "monthly_revenue": monthly_revenue,
    }
