"""
Validation matrix — PropManager
Centralised Pydantic v2 validators for all commercial models.
Import and apply these validators to any schema that needs them.
"""

import re
from datetime import date
from typing import Optional
from pydantic import field_validator, model_validator


# ── Reusable field validators ──────────────────────────────────────────────────

def validate_non_empty_string(v: Optional[str], field_name: str = "Field") -> Optional[str]:
    if v is not None:
        v = v.strip()
        if len(v) == 0:
            raise ValueError(f"{field_name} cannot be empty")
        if len(v) > 255:
            raise ValueError(f"{field_name} must be under 255 characters")
    return v

def validate_email(v: Optional[str]) -> Optional[str]:
    if v is None or v.strip() == "":
        return None
    v = v.strip().lower()
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, v):
        raise ValueError(f"'{v}' is not a valid email address")
    if len(v) > 255:
        raise ValueError("Email must be under 255 characters")
    return v

def validate_positive_float(v: Optional[float], field_name: str = "Amount") -> Optional[float]:
    if v is not None and v < 0:
        raise ValueError(f"{field_name} cannot be negative")
    return v

def validate_area(v: Optional[float]) -> Optional[float]:
    if v is not None:
        if v <= 0:
            raise ValueError("Area must be greater than 0")
        if v > 9_999_999:
            raise ValueError("Area value is unrealistically large")
    return v

def validate_year(v: Optional[int]) -> Optional[int]:
    if v is not None:
        if v < 1800 or v > 2100:
            raise ValueError("Construction year must be between 1800 and 2100")
    return v

def validate_currency_code(v: Optional[str]) -> Optional[str]:
    if v is None:
        return "USD"
    v = v.strip().upper()
    if len(v) != 3 or not v.isalpha():
        raise ValueError(f"Currency must be a 3-letter ISO code (e.g. USD, EUR, MAD), got '{v}'")
    return v

def validate_date_range(start: Optional[date], end: Optional[date], start_name: str = "Start date", end_name: str = "End date") -> None:
    if start and end and end <= start:
        raise ValueError(f"{end_name} must be after {start_name}")

def validate_phone(v: Optional[str]) -> Optional[str]:
    if v is None or v.strip() == "":
        return None
    v = v.strip()
    # Allow +, spaces, dashes, dots, parens, digits
    cleaned = re.sub(r'[\s\-\.\(\)]', '', v)
    if cleaned.startswith('+'):
        cleaned = cleaned[1:]
    if not cleaned.isdigit():
        raise ValueError(f"Phone number contains invalid characters: '{v}'")
    if len(cleaned) < 7 or len(cleaned) > 15:
        raise ValueError(f"Phone number must be between 7 and 15 digits, got {len(cleaned)}")
    return v

def validate_floor_number(v: int) -> int:
    if v < -10 or v > 200:
        raise ValueError("Floor number must be between -10 and 200")
    return v

def validate_space_code(v: str) -> str:
    v = v.strip().upper()
    if not v:
        raise ValueError("Space code is required")
    if len(v) > 50:
        raise ValueError("Space code must be under 50 characters")
    if not re.match(r'^[A-Z0-9\-\_\.]+$', v):
        raise ValueError(f"Space code can only contain letters, numbers, hyphens and underscores, got '{v}'")
    return v

def validate_contract_number(v: Optional[str]) -> Optional[str]:
    if v is None or v.strip() == "":
        return None
    v = v.strip()
    if len(v) > 100:
        raise ValueError("Contract number must be under 100 characters")
    return v

def validate_condition_amount(v: Optional[float]) -> Optional[float]:
    if v is not None and v < 0:
        raise ValueError("Condition amount cannot be negative")
    return v

def validate_ipc_index(v: Optional[float]) -> Optional[float]:
    if v is not None:
        if v <= 0:
            raise ValueError("IPC base index must be greater than 0")
        if v > 100_000:
            raise ValueError("IPC base index value is unrealistically large")
    return v

def validate_markup_rate(v: Optional[float]) -> Optional[float]:
    if v is not None:
        if v < 0:
            raise ValueError("Markup rate cannot be negative")
        if v > 100:
            raise ValueError("Markup rate cannot exceed 100%")
    return v


# ── Continent/Country values ───────────────────────────────────────────────────

VALID_CONTINENTS = {
    "Africa", "Asia Pacific", "Europe", "Middle East", "North America", "South America"
}

def validate_continent(v: Optional[str]) -> Optional[str]:
    if v and v not in VALID_CONTINENTS:
        raise ValueError(f"Invalid continent '{v}'. Valid: {sorted(VALID_CONTINENTS)}")
    return v


# ── Contract type / status / payment enums ─────────────────────────────────────

VALID_CONTRACT_TYPES    = {"lease_out", "lease_in"}
VALID_CONTRACT_STATUSES = {"draft", "released", "terminated", "expired"}
VALID_PAYMENT_TIMINGS   = {"in_advance", "in_arrears"}
VALID_DAY_COUNT_METHODS = {"act_365", "act_360", "act_act", "30_360"}
VALID_CONDITION_TYPES   = {"base_rent", "service_charge", "advance_payment", "flat_rate", "sales_based", "markup_fee", "rent_free", "abatement"}
VALID_FREQUENCIES       = {"monthly", "quarterly", "semi_annual", "annual"}
VALID_BP_ROLES          = {"master_tenant", "guarantor", "landlord", "vendor", "contact_person"}
VALID_SPACE_STATUSES    = {"available", "occupied", "maintenance", "vacant"}
VALID_USAGE_TYPES       = {"retail", "office", "warehouse", "restaurant", "services", "storage", "other"}

def validate_enum(v: Optional[str], valid_set: set, field_name: str) -> Optional[str]:
    if v and v not in valid_set:
        raise ValueError(f"Invalid {field_name} '{v}'. Valid values: {sorted(valid_set)}")
    return v
