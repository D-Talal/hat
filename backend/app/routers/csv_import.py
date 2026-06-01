"""
CSV Import Router — PropManager
Allows clients to migrate existing data via structured CSV files.

Import order (respect dependencies):
  1. POST /api/import/business-partners   → tenants & landlords
  2. POST /api/import/properties          → business entities + buildings + rental objects
  3. POST /api/import/contracts           → contracts + conditions (refs BPs + ROs)

Each endpoint returns a detailed report: rows imported, rows skipped, errors per row.
Template CSVs available at:
  GET /api/import/template/{entity}
"""

import csv
import io
import logging
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_user, get_current_org
from app.core.permissions import require_permission
from app.models.retail import (
    BusinessPartner, BusinessPartnerRole, BPRole,
    BusinessEntity, Building, Space, Floor,
    Contract, ContractObject, Condition,
    ContractStatus, ContractType, ConditionType, ConditionFrequency, PaymentTiming,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Helpers ────────────────────────────────────────────────────────────────────

def _parse_date(val: str, field: str) -> Optional[date]:
    if not val or val.strip() == "":
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(val.strip(), fmt).date()
        except ValueError:
            continue
    raise ValueError(f"'{field}' invalid date format '{val}' — use YYYY-MM-DD")

def _parse_float(val: str, field: str) -> Optional[float]:
    if not val or val.strip() == "":
        return None
    try:
        return float(val.strip().replace(",", "").replace(" ", ""))
    except ValueError:
        raise ValueError(f"'{field}' must be a number, got '{val}'")

def _parse_bool(val: str) -> bool:
    return val.strip().lower() in ("true", "1", "yes", "oui", "y")

def _read_csv(file_bytes: bytes) -> list[dict]:
    text = file_bytes.decode("utf-8-sig")  # handle BOM from Excel
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise HTTPException(400, "CSV file is empty")
    return rows

def _report(imported: int, skipped: int, errors: list[dict]) -> dict:
    return {
        "imported": imported,
        "skipped":  skipped,
        "errors":   errors,
        "success":  len(errors) == 0,
    }


# ── Template CSVs ──────────────────────────────────────────────────────────────

TEMPLATES = {
    "business-partners": {
        "filename": "template_business_partners.csv",
        "headers": [
            "company_name*", "trade_name", "contact_name", "email",
            "phone", "address", "city", "country", "tax_id",
            "role*",          # master_tenant | guarantor | landlord | vendor
            "customer_account",
        ],
        "example": [
            "Acme Retail SARL", "Acme", "John Doe", "john@acme.com",
            "+212 600 000000", "123 Rue Mohammed V", "Casablanca", "Morocco", "RC12345",
            "master_tenant", "ACC-001",
        ],
    },
    "properties": {
        "filename": "template_properties.csv",
        "headers": [
            "entity_name*", "entity_legal_name", "entity_tax_id",
            "entity_country", "entity_city", "entity_address", "entity_currency",
            "building_name*", "building_address", "building_city",
            "building_total_area_sqm", "building_construction_year",
            "unit_code*",     # rental object code — unique per building
            "unit_description", "unit_usage_type", "unit_cost_center",
        ],
        "example": [
            "Centre Commercial Atlas", "SCI Atlas", "IF12345",
            "Morocco", "Casablanca", "Bd Zerktouni", "MAD",
            "Bâtiment A", "Bd Zerktouni", "Casablanca",
            "12500", "2010",
            "U-001", "Boutique rez-de-chaussée", "retail", "CC-001",
        ],
    },
    "contracts": {
        "filename": "template_contracts.csv",
        "headers": [
            "contract_number*",
            "tenant_company_name*",   # must match an existing BP
            "entity_name*",           # must match an existing BusinessEntity
            "unit_code*",             # must match an existing Space code
            "start_date*",            # YYYY-MM-DD
            "end_date*",              # YYYY-MM-DD
            "signing_date",
            "status",                 # draft | released
            "payment_timing",         # in_advance | in_arrears
            "condition_type*",        # base_rent | service_charge | advance_payment | flat_rate
            "condition_amount*",
            "condition_currency",
            "condition_frequency",    # monthly | quarterly | semi_annual | annual
            "condition_valid_from*",
            "condition_valid_to",
            "notes",
        ],
        "example": [
            "CTR-2024-001",
            "Acme Retail SARL",
            "Centre Commercial Atlas",
            "U-001",
            "2024-01-01", "2026-12-31",
            "2023-12-15",
            "released",
            "in_advance",
            "base_rent", "25000", "MAD",
            "monthly",
            "2024-01-01", "",
            "Bail commercial 3 ans",
        ],
    },
}

@router.get("/template/{entity}")
def download_template(entity: str, u=Depends(get_current_user)):
    tpl = TEMPLATES.get(entity)
    if not tpl:
        raise HTTPException(404, f"No template for '{entity}'. Valid: {list(TEMPLATES.keys())}")

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(tpl["headers"])
    writer.writerow(tpl["example"])
    buf.seek(0)

    return StreamingResponse(
        io.BytesIO(buf.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={tpl['filename']}"},
    )


# ── Import 1: Business Partners ───────────────────────────────────────────────

@router.post("/business-partners")
async def import_business_partners(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    u=Depends(require_permission("create")),
    org=Depends(get_current_org),
):
    """
    Import tenants and partners.
    Required columns: company_name, role
    """
    rows = _read_csv(await file.read())
    imported, skipped = 0, 0
    errors = []

    for i, row in enumerate(rows, start=2):
        try:
            company_name = row.get("company_name*", row.get("company_name", "")).strip()
            if not company_name:
                raise ValueError("'company_name' is required")

            role_str = row.get("role*", row.get("role", "master_tenant")).strip().lower()
            try:
                role = BPRole(role_str)
            except ValueError:
                raise ValueError(f"Invalid role '{role_str}'. Valid: {[r.value for r in BPRole]}")

            # Check duplicate by company_name + org
            existing = db.query(BusinessPartner).filter(
                BusinessPartner.org_id == org.id,
                BusinessPartner.company_name == company_name,
            ).first()

            if existing:
                bp = existing
                skipped += 1
            else:
                # Auto BP number
                count = db.query(BusinessPartner).filter(
                    BusinessPartner.org_id == org.id
                ).count()
                bp = BusinessPartner(
                    org_id=org.id,
                    bp_number=f"BP-{count+1:05d}",
                    company_name=company_name,
                    trade_name=row.get("trade_name", "").strip() or None,
                    contact_name=row.get("contact_name", "").strip() or None,
                    email=row.get("email", "").strip() or None,
                    phone=row.get("phone", "").strip() or None,
                    address=row.get("address", "").strip() or None,
                    city=row.get("city", "").strip() or None,
                    country=row.get("country", "").strip() or None,
                    tax_id=row.get("tax_id", "").strip() or None,
                    is_active=True,
                )
                db.add(bp)
                db.flush()
                imported += 1

            # Add role if not exists
            existing_role = db.query(BusinessPartnerRole).filter(
                BusinessPartnerRole.business_partner_id == bp.id,
                BusinessPartnerRole.role == role,
            ).first()
            if not existing_role:
                db.add(BusinessPartnerRole(
                    business_partner_id=bp.id,
                    role=role,
                    customer_account=row.get("customer_account", "").strip() or None,
                ))

        except Exception as e:
            errors.append({"row": i, "company": row.get("company_name*", row.get("company_name", "?")), "error": str(e)})

    db.commit()
    return _report(imported, skipped, errors)


# ── Import 2: Properties (Entity + Building + Units) ─────────────────────────

@router.post("/properties")
async def import_properties(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    u=Depends(require_permission("create")),
    org=Depends(get_current_org),
):
    """
    Import property hierarchy: BusinessEntity → Building → Floor → Space.
    One row = one rental unit. Entity and Building are created once and reused.
    Required: entity_name, building_name, unit_code
    """
    rows = _read_csv(await file.read())
    imported, skipped = 0, 0
    errors = []

    # Cache to avoid duplicate DB lookups in same import
    entity_cache: dict[str, BusinessEntity] = {}
    building_cache: dict[str, Building] = {}

    for i, row in enumerate(rows, start=2):
        try:
            entity_name   = row.get("entity_name*",   row.get("entity_name",   "")).strip()
            building_name = row.get("building_name*", row.get("building_name", "")).strip()
            unit_code     = row.get("unit_code*",     row.get("unit_code",     "")).strip()

            if not entity_name:   raise ValueError("'entity_name' is required")
            if not building_name: raise ValueError("'building_name' is required")
            if not unit_code:     raise ValueError("'unit_code' is required")

            # ── BusinessEntity ──
            be = entity_cache.get(entity_name) or db.query(BusinessEntity).filter(
                BusinessEntity.org_id == org.id,
                BusinessEntity.name == entity_name,
            ).first()
            if not be:
                be = BusinessEntity(
                    org_id=org.id,
                    name=entity_name,
                    legal_name=row.get("entity_legal_name", "").strip() or None,
                    tax_id=row.get("entity_tax_id", "").strip() or None,
                    country=row.get("entity_country", "").strip() or None,
                    city=row.get("entity_city", "").strip() or None,
                    address=row.get("entity_address", "").strip() or None,
                    currency=row.get("entity_currency", "USD").strip() or "USD",
                )
                db.add(be)
                db.flush()
            entity_cache[entity_name] = be

            # ── Building ──
            bldg_key = f"{be.id}::{building_name}"
            bldg = building_cache.get(bldg_key) or db.query(Building).filter(
                Building.business_entity_id == be.id,
                Building.name == building_name,
            ).first()
            if not bldg:
                bldg = Building(
                    business_entity_id=be.id,
                    name=building_name,
                    address=row.get("building_address", "").strip() or None,
                    city=row.get("building_city", "").strip() or None,
                    total_area_sqm=_parse_float(row.get("building_total_area_sqm", ""), "building_total_area_sqm"),
                    construction_year=int(row["building_construction_year"]) if row.get("building_construction_year", "").strip() else None,
                )
                db.add(bldg)
                db.flush()
            building_cache[bldg_key] = bldg

            # ── Space lookup ──
            # Spaces must be created via Patrimoine UI, not CSV import
            # We look up an existing space by space_code within this entity's buildings
            ro = None
            from app.models.retail import Floor
            ro = db.query(Space).join(Floor).filter(
                Floor.building_id == bldg.id,
                Space.space_code == unit_code,
            ).first()
            if not ro:
                skipped += 1
                continue

            imported += 1

        except Exception as e:
            errors.append({"row": i, "unit": row.get("unit_code*", row.get("unit_code", "?")), "error": str(e)})

    db.commit()
    return _report(imported, skipped, errors)


# ── Import 3: Contracts + Conditions ─────────────────────────────────────────

@router.post("/contracts")
async def import_contracts(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    u=Depends(require_permission("create")),
    org=Depends(get_current_org),
):
    """
    Import contracts and their base conditions.
    Requires business partners and properties to be imported first.
    Required: contract_number, tenant_company_name, entity_name, unit_code,
              start_date, end_date, condition_type, condition_amount, condition_valid_from
    """
    rows = _read_csv(await file.read())
    imported, skipped = 0, 0
    errors = []

    # Pre-build lookups
    bp_cache:  dict[str, BusinessPartner] = {}
    be_cache:  dict[str, BusinessEntity]  = {}
    ro_cache:  dict = {}

    for i, row in enumerate(rows, start=2):
        try:
            contract_number = row.get("contract_number*", row.get("contract_number", "")).strip()
            tenant_name     = row.get("tenant_company_name*", row.get("tenant_company_name", "")).strip()
            entity_name     = row.get("entity_name*", row.get("entity_name", "")).strip()
            unit_code       = row.get("unit_code*", row.get("unit_code", "")).strip()
            start_date_str  = row.get("start_date*", row.get("start_date", "")).strip()
            end_date_str    = row.get("end_date*", row.get("end_date", "")).strip()
            cond_type_str   = row.get("condition_type*", row.get("condition_type", "")).strip()
            cond_amount_str = row.get("condition_amount*", row.get("condition_amount", "")).strip()
            cond_vf_str     = row.get("condition_valid_from*", row.get("condition_valid_from", "")).strip()

            for field, val in [("contract_number", contract_number), ("tenant_company_name", tenant_name),
                                ("entity_name", entity_name), ("unit_code", unit_code),
                                ("start_date", start_date_str), ("end_date", end_date_str),
                                ("condition_type", cond_type_str), ("condition_amount", cond_amount_str),
                                ("condition_valid_from", cond_vf_str)]:
                if not val:
                    raise ValueError(f"'{field}' is required")

            # Skip duplicate contract numbers
            if db.query(Contract).filter(Contract.contract_number == contract_number).first():
                skipped += 1
                continue

            # Resolve BusinessPartner
            bp = bp_cache.get(tenant_name)
            if not bp:
                bp = db.query(BusinessPartner).filter(
                    BusinessPartner.org_id == org.id,
                    BusinessPartner.company_name == tenant_name,
                ).first()
                if not bp:
                    raise ValueError(f"Business partner '{tenant_name}' not found — import business partners first")
                bp_cache[tenant_name] = bp

            # Resolve BusinessEntity
            be = be_cache.get(entity_name)
            if not be:
                be = db.query(BusinessEntity).filter(
                    BusinessEntity.org_id == org.id,
                    BusinessEntity.name == entity_name,
                ).first()
                if not be:
                    raise ValueError(f"Property '{entity_name}' not found — import properties first")
                be_cache[entity_name] = be

            # Resolve RentalObject
            ro_key = f"{be.id}::{unit_code}"
            ro = ro_cache.get(ro_key)
            if not ro:
                ro = None
                if not ro:
                    # Space lookup by space_code — search across floors of this entity's buildings
                    from app.models.retail import Floor
                    ro = db.query(Space).join(Floor).join(Building).filter(
                        Building.business_entity_id == be.id,
                        Space.space_code == unit_code,
                    ).first()
                if not ro:
                    raise ValueError(f"Space '{unit_code}' not found in '{entity_name}' — create spaces in Patrimoine first")
                ro_cache[ro_key] = ro

            # Parse dates
            start_date = _parse_date(start_date_str, "start_date")
            end_date   = _parse_date(end_date_str,   "end_date")
            if not start_date or not end_date:
                raise ValueError("start_date and end_date are required")

            # Parse status
            status_str = row.get("status", "released").strip().lower()
            try:
                status = ContractStatus(status_str)
            except ValueError:
                status = ContractStatus.released

            # Parse payment timing
            pt_str = row.get("payment_timing", "in_advance").strip().lower()
            try:
                payment_timing = PaymentTiming(pt_str)
            except ValueError:
                payment_timing = PaymentTiming.in_advance

            # Create contract
            contract = Contract(
                contract_number=contract_number,
                business_partner_id=bp.id,
                business_entity_id=be.id,
                contract_type=ContractType.lease_out,
                status=status,
                start_date=start_date,
                absolute_end_date=end_date,
                probable_end_date=end_date,
                signing_date=_parse_date(row.get("signing_date", ""), "signing_date"),
                payment_timing=payment_timing,
                notes=row.get("notes", "").strip() or None,
            )
            db.add(contract)
            db.flush()

            # Link space to contract
            if ro:
                db.add(ContractObject(
                    contract_id=contract.id,
                    space_id=ro.id,
                    valid_from=start_date,
                    valid_to=end_date,
                ))

            # Create condition
            try:
                cond_type = ConditionType(cond_type_str)
            except ValueError:
                raise ValueError(f"Invalid condition_type '{cond_type_str}'. Valid: {[t.value for t in ConditionType]}")

            freq_str = row.get("condition_frequency", "monthly").strip().lower()
            try:
                frequency = ConditionFrequency(freq_str)
            except ValueError:
                frequency = ConditionFrequency.monthly

            db.add(Condition(
                contract_id=contract.id,
                condition_type=cond_type,
                valid_from=_parse_date(cond_vf_str, "condition_valid_from"),
                valid_to=_parse_date(row.get("condition_valid_to", ""), "condition_valid_to"),
                amount=_parse_float(cond_amount_str, "condition_amount"),
                currency=row.get("condition_currency", "USD").strip() or "USD",
                frequency=frequency,
                payment_timing=payment_timing,
            ))

            imported += 1

        except Exception as e:
            errors.append({"row": i, "contract": row.get("contract_number*", row.get("contract_number", "?")), "error": str(e)})

    db.commit()
    return _report(imported, skipped, errors)


# ── Import status overview ─────────────────────────────────────────────────────

@router.get("/status")
def import_status(
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
    org=Depends(get_current_org),
):
    """Returns counts of existing records to verify import results."""
    from sqlalchemy import func
    from app.models.retail import Building

    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]

    return {
        "business_partners": db.query(func.count(BusinessPartner.id)).filter(BusinessPartner.org_id == org.id).scalar(),
        "business_entities": len(be_ids),
        "buildings": db.query(func.count(Building.id)).filter(Building.business_entity_id.in_(be_ids)).scalar() if be_ids else 0,
        "spaces": db.query(func.count(Space.id)).join(Floor).join(Building).filter(Building.business_entity_id.in_(be_ids)).scalar() if be_ids else 0,
        "contracts": db.query(func.count(Contract.id)).filter(Contract.business_entity_id.in_(be_ids)).scalar() if be_ids else 0,
    }
