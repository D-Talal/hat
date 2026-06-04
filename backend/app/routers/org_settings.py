from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.organization import Organization
from app.models.audit import AuditLog
from app.core.deps import get_current_user, get_current_org
from app.core.permissions import require_permission

router = APIRouter(prefix="/api/org-settings", tags=["Organization Settings"])

# Allow-lists keep input safe without needing a full ISO library.
ALLOWED_CURRENCIES = {
    "USD", "EUR", "GBP", "CAD", "AUD", "CHF", "JPY", "CNY", "INR", "BRL",
    "MXN", "ZAR", "AED", "SAR", "SGD", "HKD", "SEK", "NOK", "DKK", "PLN",
}
ALLOWED_AREA_UNITS = {"sqm", "sqft"}


class OrgSettingsOut(BaseModel):
    default_currency: str
    country: str
    locale: str
    timezone: str
    area_unit: str


class OrgSettingsUpdate(BaseModel):
    default_currency: Optional[str] = None
    country: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None
    area_unit: Optional[str] = None


@router.get("", response_model=OrgSettingsOut)
def get_org_settings(org=Depends(get_current_org)):
    return OrgSettingsOut(
        default_currency=org.default_currency or "USD",
        country=org.country or "US",
        locale=org.locale or "en-US",
        timezone=org.timezone or "UTC",
        area_unit=org.area_unit or "sqm",
    )


@router.put("", response_model=OrgSettingsOut)
def update_org_settings(
    data: OrgSettingsUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("manage_users")),  # admin-level
    org=Depends(get_current_org),
):
    o = db.query(Organization).filter(Organization.id == org.id).first()
    if not o:
        raise HTTPException(404, "Organization not found")

    if data.default_currency is not None:
        cur = data.default_currency.upper().strip()
        if cur not in ALLOWED_CURRENCIES:
            raise HTTPException(400, f"Unsupported currency: {cur}")
        o.default_currency = cur

    if data.area_unit is not None:
        unit = data.area_unit.lower().strip()
        if unit not in ALLOWED_AREA_UNITS:
            raise HTTPException(400, f"Unsupported area unit: {unit}")
        o.area_unit = unit

    # country / locale / timezone are free-form but length-bounded by the column.
    if data.country is not None:
        o.country = data.country.upper().strip()[:2]
    if data.locale is not None:
        o.locale = data.locale.strip()[:10]
    if data.timezone is not None:
        o.timezone = data.timezone.strip()[:50]

    db.add(AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="UPDATE_ORG_SETTINGS",
        resource="organization",
        resource_id=o.id,
        details=f"Updated i18n settings for org {o.id}",
    ))
    db.commit()
    db.refresh(o)

    return OrgSettingsOut(
        default_currency=o.default_currency,
        country=o.country,
        locale=o.locale,
        timezone=o.timezone,
        area_unit=o.area_unit,
    )
