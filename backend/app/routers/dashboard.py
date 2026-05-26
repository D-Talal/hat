"""
Dashboard API Router — PropManager
Endpoints: /finance, /occupancy, /cashflow, /assets
All data filtered by org_id of the authenticated user.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, timedelta
from typing import Literal
from app.database import get_db
from app.core.deps import get_current_user, get_current_org
from app.models.hotel import Hotel, Room, Booking, BookingStatus
from app.models.retail import (
    BusinessEntity, RentalObject, SpaceStatus,
    Contract, ContractStatus, Invoice, MaintenanceRequest
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

ModuleType = Literal["commercial", "hotel", "all"]


def get_month_range(months_back: int = 0):
    today = date.today()
    first_of_month = today.replace(day=1)
    target = (first_of_month - timedelta(days=1) * 30 * months_back).replace(day=1)
    if months_back == 0:
        return target, today
    next_month = (target.replace(day=28) + timedelta(days=4)).replace(day=1)
    return target, next_month - timedelta(days=1)


def _commercial_contract_ids(db, org):
    """Return all contract IDs belonging to this org (via BusinessEntity chain)."""
    be_ids = [
        r[0] for r in db.query(BusinessEntity.id)
        .filter(BusinessEntity.org_id == org.id).all()
    ]
    if not be_ids:
        return []
    from app.models.retail import Building, Floor, Space, RentalObject, ContractObject
    # contracts are linked via ContractObject → RentalObject → Space → Floor → Building → BusinessEntity
    # Simpler: filter contracts that have at least one ContractObject whose rental_object is in our org
    # But rental_objects don't have direct org_id — use the BE chain
    # Fastest: get all contract IDs via Invoice which links to contract_id
    contract_ids = [
        r[0] for r in db.query(Contract.id)
        .join(ContractObject, ContractObject.contract_id == Contract.id)
        .join(RentalObject, RentalObject.id == ContractObject.rental_object_id)
        .join(Space, Space.id == RentalObject.space_id)
        .join(Floor, Floor.id == Space.floor_id)
        .join(Building, Building.id == Floor.building_id)
        .filter(Building.business_entity_id.in_(be_ids))
        .all()
    ]
    return contract_ids


def _org_invoice_q(db, org, *filters):
    """Query invoices filtered by org."""
    contract_ids = _commercial_contract_ids(db, org)
    if not contract_ids:
        return db.query(Invoice).filter(Invoice.id == -1)  # empty result
    return db.query(Invoice).filter(Invoice.contract_id.in_(contract_ids), *filters)


def _org_rental_object_q(db, org):
    """Query rental objects filtered by org via BE chain."""
    from app.models.retail import Building, Floor, Space
    be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
    if not be_ids:
        return db.query(RentalObject).filter(RentalObject.id == -1)
    return (
        db.query(RentalObject)
        .join(Space, Space.id == RentalObject.space_id)
        .join(Floor, Floor.id == Space.floor_id)
        .join(Building, Building.id == Floor.building_id)
        .filter(Building.business_entity_id.in_(be_ids))
    )


# ─────────────────────────────────────────────────────────────
# 1. FINANCE & REVENUE
# ─────────────────────────────────────────────────────────────

@router.get("/finance")
def get_finance(
    module: ModuleType = Query("all"),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
    org=Depends(get_current_org),
):
    today = date.today()
    first_of_month = today.replace(day=1)
    last_month_start = (first_of_month - timedelta(days=1)).replace(day=1)

    result = {
        "total_revenue": 0.0,
        "revenue_this_month": 0.0,
        "revenue_last_month": 0.0,
        "outstanding_invoices": 0.0,
        "overdue_invoices": 0.0,
        "active_contracts": 0,
        "expiring_soon": 0,
        "pending_maintenance": 0,
        "revenue_by_month": [],
    }

    commercial_monthly = {}
    hotel_monthly_map = {}

    # ── Commercial ──────────────────────────────────────────
    if module in ("commercial", "all"):
        def inv_sum(*filters):
            q = _org_invoice_q(db, org, *filters)
            return float(db.query(func.coalesce(func.sum(Invoice.amount), 0))
                         .filter(Invoice.id.in_(q.with_entities(Invoice.id))).scalar())

        result["total_revenue"]        += inv_sum(Invoice.status == "paid")
        result["revenue_this_month"]   += inv_sum(Invoice.status == "paid", Invoice.paid_date >= first_of_month)
        result["revenue_last_month"]   += inv_sum(Invoice.status == "paid", Invoice.paid_date >= last_month_start, Invoice.paid_date < first_of_month)
        result["outstanding_invoices"] += inv_sum(Invoice.status == "pending")
        result["overdue_invoices"]     += inv_sum(Invoice.status == "pending", Invoice.due_date < today)

        # Active contracts
        contract_ids = _commercial_contract_ids(db, org)
        if contract_ids:
            result["active_contracts"] = db.query(func.count(Contract.id)).filter(
                Contract.id.in_(contract_ids),
                Contract.status == ContractStatus.released,
            ).scalar() or 0

            # Expiring in next 90 days
            result["expiring_soon"] = db.query(func.count(Contract.id)).filter(
                Contract.id.in_(contract_ids),
                Contract.status == ContractStatus.released,
                Contract.absolute_end_date <= today + timedelta(days=90),
                Contract.absolute_end_date >= today,
            ).scalar() or 0

        # Pending maintenance (org-wide via BE chain)
        be_ids = [r[0] for r in db.query(BusinessEntity.id).filter(BusinessEntity.org_id == org.id).all()]
        if contract_ids:
            result["pending_maintenance"] = db.query(func.count(MaintenanceRequest.id)).filter(
                MaintenanceRequest.status != "closed",
                MaintenanceRequest.contract_id.in_(contract_ids),
            ).scalar() or 0

        # Monthly revenue chart
        if contract_ids:
            monthly = (
                db.query(
                    extract("year", Invoice.paid_date).label("year"),
                    extract("month", Invoice.paid_date).label("month"),
                    func.sum(Invoice.amount).label("amount"),
                )
                .filter(
                    Invoice.contract_id.in_(contract_ids),
                    Invoice.status == "paid",
                    Invoice.paid_date >= today - timedelta(days=365),
                )
                .group_by("year", "month")
                .order_by("year", "month")
                .all()
            )
            commercial_monthly = {
                f"{int(r.year)}-{int(r.month):02d}": float(r.amount)
                for r in monthly
            }

    # ── Hotel ────────────────────────────────────────────────
    if module in ("hotel", "all"):
        def booking_sum(*filters):
            return float(
                db.query(func.coalesce(func.sum(Booking.total_amount), 0))
                .join(Room).join(Hotel)
                .filter(Hotel.org_id == org.id, *filters)
                .scalar()
            )

        result["total_revenue"]      += booking_sum(Booking.status == BookingStatus.confirmed)
        result["revenue_this_month"] += booking_sum(Booking.status == BookingStatus.confirmed, Booking.check_in >= first_of_month)
        result["revenue_last_month"] += booking_sum(Booking.status == BookingStatus.confirmed, Booking.check_in >= last_month_start, Booking.check_in < first_of_month)

        hotel_monthly = (
            db.query(
                extract("year", Booking.check_in).label("year"),
                extract("month", Booking.check_in).label("month"),
                func.sum(Booking.total_amount).label("amount"),
            )
            .join(Room).join(Hotel)
            .filter(Hotel.org_id == org.id, Booking.status == BookingStatus.confirmed, Booking.check_in >= today - timedelta(days=365))
            .group_by("year", "month")
            .order_by("year", "month")
            .all()
        )
        hotel_monthly_map = {f"{int(r.year)}-{int(r.month):02d}": float(r.amount) for r in hotel_monthly}

    # Merge monthly
    for ym in sorted(set(commercial_monthly) | set(hotel_monthly_map)):
        result["revenue_by_month"].append({
            "month": ym,
            "amount": round(commercial_monthly.get(ym, 0.0) + hotel_monthly_map.get(ym, 0.0), 2),
        })

    return result


# ─────────────────────────────────────────────────────────────
# 2. OCCUPANCY / VACANCY
# ─────────────────────────────────────────────────────────────

@router.get("/occupancy")
def get_occupancy(
    module: ModuleType = Query("all"),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
    org=Depends(get_current_org),
):
    result = {}
    today = date.today()

    if module in ("commercial", "all"):
        ro_q = _org_rental_object_q(db, org)
        total_objects = ro_q.count() or 0
        occupied = ro_q.filter(RentalObject.status == SpaceStatus.occupied).count() or 0
        vacant = total_objects - occupied
        result["commercial"] = {
            "total_units": total_objects,
            "occupied": occupied,
            "vacant": vacant,
            "occupancy_rate": round(occupied / total_objects * 100, 1) if total_objects else 0.0,
        }

        # 6-month trend — contracts in org
        contract_ids = _commercial_contract_ids(db, org)
        trend = []
        for i in range(5, -1, -1):
            m_start, m_end = get_month_range(i)
            active = 0
            if contract_ids:
                active = db.query(func.count(Contract.id)).filter(
                    Contract.id.in_(contract_ids),
                    Contract.status == ContractStatus.released,
                    Contract.start_date <= m_end,
                    Contract.absolute_end_date >= m_start,
                ).scalar() or 0
            trend.append({"month": m_start.strftime("%b %Y"), "occupied": active})
        result["occupancy_trend"] = trend

    if module in ("hotel", "all"):
        total_rooms = db.query(func.count(Room.id)).join(Hotel).filter(Hotel.org_id == org.id).scalar() or 0
        occupied_tonight = (
            db.query(func.count(Booking.id))
            .join(Room).join(Hotel)
            .filter(
                Hotel.org_id == org.id,
                Booking.status == BookingStatus.confirmed,
                Booking.check_in <= today,
                Booking.check_out > today,
            )
            .scalar() or 0
        )
        result["hotel"] = {
            "total_rooms": total_rooms,
            "occupied_tonight": occupied_tonight,
            "available": total_rooms - occupied_tonight,
            "occupancy_rate": round(occupied_tonight / total_rooms * 100, 1) if total_rooms else 0.0,
        }

    return result


# ─────────────────────────────────────────────────────────────
# 3. CASH FLOW
# ─────────────────────────────────────────────────────────────

@router.get("/cashflow")
def get_cashflow(
    module: ModuleType = Query("all"),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
    org=Depends(get_current_org),
):
    today = date.today()
    first_of_month = today.replace(day=1)
    monthly_data = {}

    def add_to_month(ym, inflow=0.0, outflow=0.0):
        if ym not in monthly_data:
            monthly_data[ym] = {"month": ym, "inflow": 0.0, "outflow": 0.0}
        monthly_data[ym]["inflow"]  += inflow
        monthly_data[ym]["outflow"] += outflow

    if module in ("commercial", "all"):
        contract_ids = _commercial_contract_ids(db, org)
        if contract_ids:
            rows = (
                db.query(
                    extract("year",  Invoice.paid_date).label("y"),
                    extract("month", Invoice.paid_date).label("m"),
                    func.sum(Invoice.amount).label("total"),
                )
                .filter(
                    Invoice.contract_id.in_(contract_ids),
                    Invoice.status == "paid",
                    Invoice.paid_date >= today - timedelta(days=365),
                )
                .group_by("y", "m").all()
            )
            for r in rows:
                add_to_month(f"{int(r.y)}-{int(r.m):02d}", inflow=float(r.total or 0))

    if module in ("hotel", "all"):
        rows = (
            db.query(
                extract("year",  Booking.check_in).label("y"),
                extract("month", Booking.check_in).label("m"),
                func.sum(Booking.total_amount).label("total"),
            )
            .join(Room).join(Hotel)
            .filter(
                Hotel.org_id == org.id,
                Booking.status == BookingStatus.confirmed,
                Booking.check_in >= today - timedelta(days=365),
            )
            .group_by("y", "m").all()
        )
        for r in rows:
            add_to_month(f"{int(r.y)}-{int(r.m):02d}", inflow=float(r.total or 0))

    cashflow_by_month = []
    for ym in sorted(monthly_data):
        d = monthly_data[ym]
        d["net"]     = round(d["inflow"] - d["outflow"], 2)
        d["inflow"]  = round(d["inflow"],  2)
        d["outflow"] = round(d["outflow"], 2)
        cashflow_by_month.append(d)

    this_month = monthly_data.get(first_of_month.strftime("%Y-%m"), {})
    return {
        "inflow_this_month":  this_month.get("inflow",  0.0),
        "outflow_this_month": this_month.get("outflow", 0.0),
        "net_cashflow":       this_month.get("net",     0.0),
        "cashflow_by_month":  cashflow_by_month,
    }


# ─────────────────────────────────────────────────────────────
# 4. ASSETS
# ─────────────────────────────────────────────────────────────

@router.get("/assets")
def get_assets(
    module: ModuleType = Query("all"),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
    org=Depends(get_current_org),
):
    result = {
        "total_properties": 0,
        "total_units":      0,
        "total_hotels":     0,
        "total_rooms":      0,
        "assets_by_city":   [],
        "assets_by_country":[],
    }

    if module in ("commercial", "all"):
        result["total_properties"] = db.query(func.count(BusinessEntity.id)).filter(BusinessEntity.org_id == org.id).scalar() or 0
        result["total_units"]      = _org_rental_object_q(db, org).count() or 0

        city_props = (
            db.query(BusinessEntity.city, func.count(BusinessEntity.id).label("count"))
            .filter(BusinessEntity.org_id == org.id)
            .group_by(BusinessEntity.city).all()
        )
        for r in city_props:
            result["assets_by_city"].append({"city": r.city or "Unknown", "properties": r.count, "hotels": 0})

        country_props = (
            db.query(BusinessEntity.country, func.count(BusinessEntity.id).label("count"))
            .filter(BusinessEntity.org_id == org.id)
            .group_by(BusinessEntity.country).all()
        )
        for r in country_props:
            result["assets_by_country"].append({"country": r.country or "Unknown", "properties": r.count, "hotels": 0})

    if module in ("hotel", "all"):
        result["total_hotels"] = db.query(func.count(Hotel.id)).filter(Hotel.org_id == org.id).scalar() or 0
        result["total_rooms"]  = db.query(func.count(Room.id)).join(Hotel).filter(Hotel.org_id == org.id).scalar() or 0

        city_hotels = (
            db.query(Hotel.city, func.count(Hotel.id).label("count"))
            .filter(Hotel.org_id == org.id)
            .group_by(Hotel.city).all()
        )
        city_map = {item["city"]: item for item in result["assets_by_city"]}
        for r in city_hotels:
            city = r.city or "Unknown"
            if city in city_map:
                city_map[city]["hotels"] = r.count
            else:
                result["assets_by_city"].append({"city": city, "properties": 0, "hotels": r.count})

        country_hotels = (
            db.query(Hotel.country, func.count(Hotel.id).label("count"))
            .filter(Hotel.org_id == org.id)
            .group_by(Hotel.country).all()
        )
        country_map = {item["country"]: item for item in result["assets_by_country"]}
        for r in country_hotels:
            country = r.country or "Unknown"
            if country in country_map:
                country_map[country]["hotels"] = r.count
            else:
                result["assets_by_country"].append({"country": country, "properties": 0, "hotels": r.count})

    return result
