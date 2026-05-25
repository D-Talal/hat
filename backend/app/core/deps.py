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
    Every route that accesses tenant data must inject this dependency
    and filter queries with .filter(Model.org_id == org.id).
    """
    from app.models.organization import Organization
    if not current_user.organization_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization.")
    org = db.query(Organization).filter(
        Organization.id == current_user.organization_id,
        Organization.is_active == True
    ).first()
    if not org:
        raise HTTPException(status_code=403, detail="Organization not found or inactive.")
    return org
