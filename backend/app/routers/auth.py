from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.core.auth import (
    verify_password, hash_password, create_access_token,
    generate_totp_secret, verify_totp, generate_qr_code
)
from app.core.deps import get_current_user

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class TwoFARequest(BaseModel):
    email: str
    code: str
    temp_token: str

class SetupTwoFARequest(BaseModel):
    code: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

def log_action(db, user, action, resource, resource_id=None, details=None, ip=None):
    entry = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "system",
        action=action, resource=resource,
        resource_id=resource_id, details=details, ip_address=ip
    )
    db.add(entry); db.commit()

@router.post("/login")
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(403, "Account is disabled")

    ip = request.client.host if request.client else None

    if user.totp_enabled:
        # Issue a short-lived temp token for 2FA step
        temp_token = create_access_token({"sub": str(user.id), "stage": "2fa_pending"})
        return {"requires_2fa": True, "temp_token": temp_token}

    # No 2FA — issue full token
    token = create_access_token({"sub": str(user.id), "role": user.role})
    user.last_login = func.now()
    db.commit()
    log_action(db, user, "LOGIN", "auth", ip=ip)
    return {
        "requires_2fa": False,
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role}
    }

@router.post("/verify-2fa")
def verify_2fa(data: TwoFARequest, request: Request, db: Session = Depends(get_db)):
    from app.core.auth import decode_token
    payload = decode_token(data.temp_token)
    if not payload or payload.get("stage") != "2fa_pending":
        raise HTTPException(401, "Invalid or expired 2FA session")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(401, "User not found")

    if not verify_totp(user.totp_secret, data.code):
        raise HTTPException(401, "Invalid 2FA code")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    user.last_login = func.now()
    db.commit()
    ip = request.client.host if request.client else None
    log_action(db, user, "LOGIN_2FA", "auth", ip=ip)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role}
    }

@router.post("/setup-2fa")
def setup_2fa(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.totp_enabled:
        raise HTTPException(400, "2FA already enabled")
    secret = generate_totp_secret()
    current_user.totp_secret = secret
    db.commit()
    qr = generate_qr_code(current_user.email, secret)
    return {"qr_code": qr, "secret": secret}

@router.post("/confirm-2fa")
def confirm_2fa(data: SetupTwoFARequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not current_user.totp_secret:
        raise HTTPException(400, "Run setup-2fa first")
    if not verify_totp(current_user.totp_secret, data.code):
        raise HTTPException(400, "Invalid code — try again")
    current_user.totp_enabled = True
    db.commit()
    return {"message": "2FA enabled successfully"}

@router.post("/disable-2fa")
def disable_2fa(data: SetupTwoFARequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not verify_totp(current_user.totp_secret, data.code):
        raise HTTPException(400, "Invalid code")
    current_user.totp_enabled = False
    current_user.totp_secret = None
    db.commit()
    return {"message": "2FA disabled"}

@router.post("/change-password")
def change_password(data: ChangePasswordRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    log_action(db, current_user, "CHANGE_PASSWORD", "auth")
    return {"message": "Password changed successfully"}

@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "totp_enabled": current_user.totp_enabled,
        "last_login": current_user.last_login,
    }
