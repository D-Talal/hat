from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import decode_token

bearer = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
):
    from app.models.user import User
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user

def get_current_org(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns the Organization of the current user.
    If the user has no organization_id yet (pre-migration users), auto-assigns
    the default org so existing deployments don't break.
    """
    from app.models.organization import Organization
    from app.models.user import User

    org_id = current_user.organization_id

    # Auto-heal: assign default org to users without one (legacy data)
    if not org_id:
        default_org = db.query(Organization).filter(Organization.slug == "default").first()
        if not default_org:
            default_org = db.query(Organization).first()
        if default_org:
            db.query(User).filter(User.id == current_user.id).update(
                {"organization_id": default_org.id}
            )
            db.commit()
            org_id = default_org.id
        else:
            raise HTTPException(
                status_code=403,
                detail="No organization found. Please contact your administrator."
            )

    org = db.query(Organization).filter(
        Organization.id == org_id,
    ).first()
    if not org:
        raise HTTPException(status_code=403, detail="Organization not found.")
    if org.is_active is False:
        raise HTTPException(status_code=403, detail="Organization is inactive.")
    return org
