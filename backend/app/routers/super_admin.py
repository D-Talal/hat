"""
Super Admin Router — PropManager
Only accessible to users with SUPER_ADMIN_EMAIL env var match.
Manages organization validation.

GET  /api/super-admin/orgs              → list all orgs with status
POST /api/super-admin/orgs/{id}/validate → approve an org
POST /api/super-admin/orgs/{id}/reject   → reject (deactivate) an org
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user
from app.models.organization import Organization
from app.models.user import User

router = APIRouter()

SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "")

def _require_super_admin(u=Depends(get_current_user)):
    if not SUPER_ADMIN_EMAIL:
        raise HTTPException(403, "Super admin not configured")
    if u.email.lower() != SUPER_ADMIN_EMAIL.lower():
        raise HTTPException(403, "Super admin access required")
    return u

@router.get("/orgs")
def list_orgs(db: Session = Depends(get_db), u=Depends(_require_super_admin)):
    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()
    result = []
    for org in orgs:
        admin = db.query(User).filter(User.organization_id == org.id).first()
        result.append({
            "id":           org.id,
            "name":         org.name,
            "slug":         org.slug,
            "plan":         org.plan,
            "is_validated": getattr(org, 'is_validated', False),
            "is_active":    org.is_active,
            "contact_email":getattr(org, 'contact_email', None),
            "admin_email":  admin.email if admin else None,
            "admin_name":   admin.full_name if admin else None,
            "created_at":   org.created_at.isoformat() if org.created_at else None,
            "user_count":   db.query(User).filter(User.organization_id == org.id).count(),
        })
    return result

@router.post("/orgs/{org_id}/validate")
def validate_org(org_id: int, db: Session = Depends(get_db), u=Depends(_require_super_admin)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")

    org.is_validated = True
    org.is_active    = True
    db.commit()

    # Notify the client by email
    _notify_client_validated(org, db)

    return {"message": f"Organization '{org.name}' validated successfully"}

@router.post("/orgs/{org_id}/reject")
def reject_org(org_id: int, db: Session = Depends(get_db), u=Depends(_require_super_admin)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")

    org.is_validated = False
    org.is_active    = False
    db.commit()
    return {"message": f"Organization '{org.name}' rejected"}

def _notify_client_validated(org, db):
    """Send validation confirmation email to the new client."""
    try:
        contact = getattr(org, 'contact_email', None)
        if not contact:
            admin = db.query(User).filter(User.organization_id == org.id).first()
            contact = admin.email if admin else None
        if not contact:
            return

        from app.services.email_service import _send, _base, _btn
        import os
        app_url = os.getenv("FRONTEND_URL", "https://propmanager-frontend.onrender.com")
        body = f"""
            <h2 style="margin:0 0 8px;font-size:20px;color:#0f1117;">Your account is approved! 🎉</h2>
            <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">
                Your organization <strong>{org.name}</strong> has been validated.
                You can now log in and start managing your properties.
            </p>
            <div style="background:#f0fdf4;border-radius:8px;padding:16px 20px;margin-bottom:20px;font-size:13px;color:#166534;">
                ✅ Your trial account is active. All features are available.
            </div>
            {_btn("Log in to PropManager", f"{app_url}/login")}
        """
        _send(contact, "✅ Your PropManager account is approved", _base("Account approved", body, org.name))
    except Exception:
        pass
