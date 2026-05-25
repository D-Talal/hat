import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
from app.database import get_db
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.core.auth import hash_password, create_access_token

router = APIRouter()

class RegisterRequest(BaseModel):
    org_name:   str
    email:      str
    full_name:  str
    password:   str

    @field_validator('org_name')
    @classmethod
    def org_name_valid(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Organization name must be at least 2 characters')
        if len(v) > 255:
            raise ValueError('Organization name too long')
        return v

    @field_validator('email')
    @classmethod
    def email_valid(cls, v):
        v = v.lower().strip()
        if len(v) > 255:
            raise ValueError('Email too long')
        return v

    @field_validator('password')
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v

def _make_slug(name: str, db: Session) -> str:
    """Generate a unique slug from org name."""
    base = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:80]
    slug = base
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug

@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """
    Public endpoint — creates a new Organization + Admin user in one shot.
    No auth required. Used for client onboarding.
    """
    # Check email not already taken
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "An account with this email already exists.")

    # Create organization
    slug = _make_slug(data.org_name, db)
    org = Organization(name=data.org_name.strip(), slug=slug, plan="trial")
    db.add(org)
    db.flush()  # get org.id without committing

    # Create admin user linked to org
    user = User(
        organization_id = org.id,
        email           = data.email,
        full_name       = data.full_name.strip(),
        hashed_password = hash_password(data.password),
        role            = UserRole.admin,
        is_active       = True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Return a ready-to-use token — user is logged in immediately
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "id":        user.id,
            "email":     user.email,
            "full_name": user.full_name,
            "role":      user.role,
        },
        "organization": {
            "id":   org.id,
            "name": org.name,
            "slug": org.slug,
            "plan": org.plan,
        },
    }
