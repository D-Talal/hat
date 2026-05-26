import re, os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.rate_limit import rate_limit, get_client_ip
from pydantic import BaseModel, field_validator
from app.database import get_db
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.core.auth import hash_password

router = APIRouter()

SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "")  # your personal email

class RegisterRequest(BaseModel):
    org_name:  str
    email:     str
    full_name: str
    password:  str

    @field_validator('org_name')
    @classmethod
    def org_name_valid(cls, v):
        v = v.strip()
        if len(v) < 2:   raise ValueError('Organization name must be at least 2 characters')
        if len(v) > 255: raise ValueError('Organization name too long')
        return v

    @field_validator('email')
    @classmethod
    def email_valid(cls, v):
        v = v.lower().strip()
        if len(v) > 255: raise ValueError('Email too long')
        return v

    @field_validator('password')
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:                        raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):   raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.isdigit() for c in v):   raise ValueError('Password must contain at least one number')
        return v

def _make_slug(name: str, db: Session) -> str:
    base = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:80]
    slug, counter = base, 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base}-{counter}"; counter += 1
    return slug

def _notify_super_admin(org_name: str, admin_email: str, org_id: int):
    """Send notification email to super admin when a new org registers."""
    if not SUPER_ADMIN_EMAIL:
        return
    try:
        from app.services.email_service import _send, _base, _btn
        app_url = os.getenv("FRONTEND_URL", "https://propmanager-frontend.onrender.com")
        body = f"""
            <h2 style="margin:0 0 8px;font-size:20px;color:#0f1117;">New registration request</h2>
            <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">A new organization is waiting for your approval.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fc;border-radius:8px;padding:20px;margin-bottom:20px;">
              <tr><td style="font-size:13px;color:#6b7280;padding-bottom:8px;">Organization</td>
                  <td style="font-size:14px;font-weight:600;color:#0f1117;text-align:right;">{org_name}</td></tr>
              <tr><td style="font-size:13px;color:#6b7280;">Admin email</td>
                  <td style="font-size:13px;font-weight:600;color:#0f1117;text-align:right;">{admin_email}</td></tr>
            </table>
            {_btn("Validate this account", f"{app_url}/super-admin")}
        """
        _send(SUPER_ADMIN_EMAIL, f"🆕 New registration: {org_name}", _base(f"New registration: {org_name}", body))
    except Exception:
        pass  # don't fail registration if notification fails

@router.post("/register")
def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """
    Public endpoint. Creates org + admin user but sets is_validated=False.
    The super admin must approve before the user can log in.
    """
    rate_limit(f"register:{get_client_ip(request)}", max_requests=5, window_seconds=3600)

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "An account with this email already exists.")

    slug = _make_slug(data.org_name, db)
    org = Organization(
        name=data.org_name.strip(),
        slug=slug,
        plan="trial",
        is_validated=False,        # ← pending approval
        is_active=True,
        contact_email=data.email,
    )
    db.add(org)
    db.flush()

    user = User(
        organization_id=org.id,
        email=data.email,
        full_name=data.full_name.strip(),
        hashed_password=hash_password(data.password),
        role=UserRole.admin,
        is_active=True,
        must_change_password=False,
    )
    db.add(user)
    db.commit()

    # Notify super admin
    _notify_super_admin(org.name, data.email, org.id)

    return {
        "status": "pending",
        "message": "Your account has been created and is pending approval. You will receive an email once validated.",
    }

@router.get("/register/status")
def check_register_status(email: str, db: Session = Depends(get_db)):
    """Let the registration page poll for approval status."""
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user:
        raise HTTPException(404, "Account not found")
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")
    return {
        "is_validated": org.is_validated,
        "org_name": org.name,
    }
