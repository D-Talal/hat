from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.core.auth import hash_password
from app.core.deps import get_current_user
from app.core.permissions import require_permission

router = APIRouter()

class UserCreate(BaseModel):
    email: str
    full_name: Optional[str] = None
    password: str
    role: UserRole = UserRole.viewer

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    totp_enabled: bool
    last_login: Optional[str] = None
    class Config: from_attributes = True

@router.get("/", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), current_user=Depends(require_permission("manage_users"))):
    return db.query(User).all()

@router.post("/", response_model=UserOut)
def create_user(data: UserCreate, db: Session = Depends(get_db), current_user=Depends(require_permission("manage_users"))):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
    db.add(user); db.commit(); db.refresh(user)
    log = AuditLog(user_id=current_user.id, user_email=current_user.email,
                   action="CREATE_USER", resource="users", resource_id=user.id,
                   details=f"Created user {user.email} with role {user.role}")
    db.add(log); db.commit()
    return user

@router.put("/{id}", response_model=UserOut)
def update_user(id: int, data: UserUpdate, db: Session = Depends(get_db), current_user=Depends(require_permission("manage_users"))):
    user = db.query(User).filter(User.id == id).first()
    if not user: raise HTTPException(404, "User not found")
    if data.full_name is not None: user.full_name = data.full_name
    if data.role is not None: user.role = data.role
    if data.is_active is not None: user.is_active = data.is_active
    db.commit(); db.refresh(user)
    log = AuditLog(user_id=current_user.id, user_email=current_user.email,
                   action="UPDATE_USER", resource="users", resource_id=user.id)
    db.add(log); db.commit()
    return user

@router.delete("/{id}")
def delete_user(id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("manage_users"))):
    user = db.query(User).filter(User.id == id).first()
    if not user: raise HTTPException(404, "User not found")
    if user.id == current_user.id: raise HTTPException(400, "Cannot delete yourself")
    db.delete(user); db.commit()
    return {"ok": True}

@router.get("/audit-log")
def get_audit_log(db: Session = Depends(get_db), current_user=Depends(require_permission("view_audit"))):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
    return [{"id": l.id, "user_email": l.user_email, "action": l.action,
             "resource": l.resource, "resource_id": l.resource_id,
             "details": l.details, "ip_address": l.ip_address,
             "created_at": str(l.created_at)} for l in logs]
