"""
Dashboard API Router — PropManager
Endpoints: /finance, /occupancy, /cashflow, /assets
Supports ?module=commercial|hotel|all
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, and_
from datetime import datetime, date, timedelta
from typing import Literal
from database import get_db
from models import (
    Property, Unit, Tenant, Invoice,
    Hotel, Room, Booking, MaintenanceRequest
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


# ─────────────────────────────────────────────────────────────
# 1. FINANCE & REVENUE
# ─────────────────────────────────────────────────────────────

@router.get("/finance")
def get_finance(
    module: ModuleType = Query("all"),
    db: Session = Depends(get_db)
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
        "revenue_by_month": []
    }

    # ── Commercial (invoices) ──
    if module in ("commercial", "all"):
        def invoice_sum(filters):
            q = db.query(func.coalesce(func.sum(Invoice.amount), 0)).filter(*filters)
            return float(q.scalar())

        result["total_revenue"] += invoice_sum([Invoice.status == "paid"])
        result["revenue_this_month"] += invoice_sum([
            Invoice.status == "paid",
            Invoice.paid_date >= first_of_month
        ])
        result["revenue_last_month"] += invoice_sum([
            Invoice.status == "paid",
            Invoice.paid_date >= last_month_start,
            Invoice.paid_date < first_of_month
        ])
        result["outstanding_invoices"] += invoice_sum([Invoice.status == "pending"])
        result["overdue_invoices"] += invoice_sum([
            Invoice.status == "pending",
            Invoice.due_date < today
        ])

        # Monthly breakdown (last 12 months)
        monthly = (
            db.query(
                extract("year", Invoice.paid_date).label("year"),
                extract("month", Invoice.paid_date).label("month"),
                func.sum(Invoice.amount).label("amount")
            )
            .filter(
                Invoice.status == "paid",
                Invoice.paid_date >= today - timedelta(days=365)
            )
            .group_by("year", "month")
            .order_by("year", "month")
            .all()
        )
        commercial_monthly = {
            f"{int(r.year)}-{int(r.month):02d}": float(r.amount)
            for r in monthly
        }

    # ── Hotel (bookings) ──
    if module in ("hotel", "all"):
        def booking_sum(filters):
            q = db.query(func.coalesce(func.sum(Booking.total_price), 0)).filter(*filters)
            return float(q.scalar())

        result["total_revenue"] += booking_sum([Booking.status == "confirmed"])
        result["revenue_this_month"] += booking_sum([
            Booking.status == "confirmed",
            Booking.check_in >= first_of_month
        ])
        result["revenue_last_month"] += booking_sum([
            Booking.status == "confirmed",
            Booking.check_in >= last_month_start,
            Booking.check_in < first_of_month
        ])

        hotel_monthly = (
            db.query(
                extract("year", Booking.check_in).label("year"),
                extract("month", Booking.check_in).label("month"),
                func.sum(Booking.total_price).label("amount")
            )
            .filter(
                Booking.status == "confirmed",
                Booking.check_in >= today - timedelta(days=365)
            )
            .group_by("year", "month")
            .order_by("year", "month")
            .all()
        )
        hotel_monthly_map = {
            f"{int(r.year)}-{int(r.month):02d}": float(r.amount)
            for r in hotel_monthly
        }

    # Merge monthly data
    all_months = set()
    if module in ("commercial", "all"):
        all_months.update(commercial_monthly.keys())
    if module in ("hotel", "all"):
        all_months.update(hotel_monthly_map.keys())

    for ym in sorted(all_months):
        amount = 0.0
        if module in ("commercial", "all"):
            amount += commercial_monthly.get(ym, 0.0)
        if module in ("hotel", "all"):
            amount += hotel_monthly_map.get(ym, 0.0)
        result["revenue_by_month"].append({"month": ym, "amount": round(amount, 2)})

    return result


# ─────────────────────────────────────────────────────────────
# 2. OCCUPANCY / VACANCY
# ─────────────────────────────────────────────────────────────

@router.get("/occupancy")
def get_occupancy(
    module: ModuleType = Query("all"),
    db: Session = Depends(get_db)
):
    result = {}
    today = date.today()

    if module in ("commercial", "all"):
        total_units = db.query(func.count(Unit.id)).scalar() or 0
        occupied = db.query(func.count(Unit.id)).filter(Unit.status == "occupied").scalar() or 0
        vacant = total_units - occupied
        result["commercial"] = {
            "total_units": total_units,
            "occupied": occupied,
            "vacant": vacant,
            "occupancy_rate": round((occupied / total_units * 100), 1) if total_units else 0.0
        }

    if module in ("hotel", "all"):
        total_rooms = db.query(func.count(Room.id)).scalar() or 0
        occupied_tonight = (
            db.query(func.count(Booking.id))
            .filter(
                Booking.status == "confirmed",
                Booking.check_in <= today,
                Booking.check_out > today
            )
            .scalar() or 0
        )
        available = total_rooms - occupied_tonight
        result["hotel"] = {
            "total_rooms": total_rooms,
            "occupied_tonight": occupied_tonight,
            "available": available,
            "occupancy_rate": round((occupied_tonight / total_rooms * 100), 1) if total_rooms else 0.0
        }

    # Occupancy trend last 6 months (commercial)
    if module in ("commercial", "all"):
        trend = []
        for i in range(5, -1, -1):
            m_start, m_end = get_month_range(i)
            occupied_in_month = (
                db.query(func.count(Tenant.id))
                .filter(
                    Tenant.lease_start <= m_end,
                    Tenant.lease_end >= m_start
                )
                .scalar() or 0
            )
            label = m_start.strftime("%b %Y")
            trend.append({
                "month": label,
                "occupied": occupied_in_month
            })
        result["occupancy_trend"] = trend

    return result


# ─────────────────────────────────────────────────────────────
# 3. CASH FLOW
# ─────────────────────────────────────────────────────────────

@router.get("/cashflow")
def get_cashflow(
    module: ModuleType = Query("all"),
    db: Session = Depends(get_db)
):
    today = date.today()
    first_of_month = today.replace(day=1)

    monthly_data = {}

    def add_to_month(ym, inflow=0.0, outflow=0.0):
        if ym not in monthly_data:
            monthly_data[ym] = {"month": ym, "inflow": 0.0, "outflow": 0.0}
        monthly_data[ym]["inflow"] += inflow
        monthly_data[ym]["outflow"] += outflow

    # ── Commercial inflow (paid invoices) ──
    if module in ("commercial", "all"):
        rows = (
            db.query(
                extract("year", Invoice.paid_date).label("y"),
                extract("month", Invoice.paid_date).label("m"),
                func.sum(Invoice.amount).label("total")
            )
            .filter(
                Invoice.status == "paid",
                Invoice.paid_date >= today - timedelta(days=365)
            )
            .group_by("y", "m").all()
        )
        for r in rows:
            add_to_month(f"{int(r.y)}-{int(r.m):02d}", inflow=float(r.total))

    # ── Hotel inflow (confirmed bookings) ──
    if module in ("hotel", "all"):
        rows = (
            db.query(
                extract("year", Booking.check_in).label("y"),
                extract("month", Booking.check_in).label("m"),
                func.sum(Booking.total_price).label("total")
            )
            .filter(
                Booking.status == "confirmed",
                Booking.check_in >= today - timedelta(days=365)
            )
            .group_by("y", "m").all()
        )
        for r in rows:
            add_to_month(f"{int(r.y)}-{int(r.m):02d}", inflow=float(r.total))

    # ── Maintenance outflow ──
    if module in ("commercial", "all"):
        rows = (
            db.query(
                extract("year", MaintenanceRequest.created_at).label("y"),
                extract("month", MaintenanceRequest.created_at).label("m"),
                func.sum(MaintenanceRequest.cost).label("total")
            )
            .filter(
                MaintenanceRequest.cost.isnot(None),
                MaintenanceRequest.created_at >= today - timedelta(days=365)
            )
            .group_by("y", "m").all()
        )
        for r in rows:
            add_to_month(f"{int(r.y)}-{int(r.m):02d}", outflow=float(r.total or 0))

    sorted_months = sorted(monthly_data.keys())
    cashflow_by_month = []
    for ym in sorted_months:
        d = monthly_data[ym]
        d["net"] = round(d["inflow"] - d["outflow"], 2)
        d["inflow"] = round(d["inflow"], 2)
        d["outflow"] = round(d["outflow"], 2)
        cashflow_by_month.append(d)

    # Current month summary
    this_month_data = monthly_data.get(first_of_month.strftime("%Y-%m"), {})
    return {
        "inflow_this_month": this_month_data.get("inflow", 0.0),
        "outflow_this_month": this_month_data.get("outflow", 0.0),
        "net_cashflow": this_month_data.get("net", 0.0),
        "cashflow_by_month": cashflow_by_month
    }


# ─────────────────────────────────────────────────────────────
# 4. ASSETS
# ─────────────────────────────────────────────────────────────

@router.get("/assets")
def get_assets(
    module: ModuleType = Query("all"),
    db: Session = Depends(get_db)
):
    result = {
        "total_properties": 0,
        "total_units": 0,
        "total_hotels": 0,
        "total_rooms": 0,
        "assets_by_city": [],
        "assets_by_country": []
    }

    if module in ("commercial", "all"):
        result["total_properties"] = db.query(func.count(Property.id)).scalar() or 0
        result["total_units"] = db.query(func.count(Unit.id)).scalar() or 0

        city_props = (
            db.query(Property.city, func.count(Property.id).label("count"))
            .group_by(Property.city)
            .all()
        )
        for r in city_props:
            result["assets_by_city"].append({
                "city": r.city or "Unknown",
                "properties": r.count,
                "hotels": 0
            })

    if module in ("hotel", "all"):
        result["total_hotels"] = db.query(func.count(Hotel.id)).scalar() or 0
        result["total_rooms"] = db.query(func.count(Room.id)).scalar() or 0

        city_hotels = (
            db.query(Hotel.city, func.count(Hotel.id).label("count"))
            .group_by(Hotel.city)
            .all()
        )
        city_map = {r["city"]: r for r in result["assets_by_city"]}
        for r in city_hotels:
            city = r.city or "Unknown"
            if city in city_map:
                city_map[city]["hotels"] = r.count
            else:
                result["assets_by_city"].append({
                    "city": city,
                    "properties": 0,
                    "hotels": r.count
                })

    # Country breakdown
    if module in ("commercial", "all"):
        country_props = (
            db.query(Property.country, func.count(Property.id).label("count"))
            .group_by(Property.country)
            .all()
        )
        for r in country_props:
            result["assets_by_country"].append({
                "country": r.country or "Unknown",
                "properties": r.count,
                "hotels": 0
            })

    if module in ("hotel", "all"):
        country_hotels = (
            db.query(Hotel.country, func.count(Hotel.id).label("count"))
            .group_by(Hotel.country)
            .all()
        )
        country_map = {r["country"]: r for r in result["assets_by_country"]}
        for r in country_hotels:
            country = r.country or "Unknown"
            if country in country_map:
                country_map[country]["hotels"] = r.count
            else:
                result["assets_by_country"].append({
                    "country": country,
                    "properties": 0,
                    "hotels": r.count
                })

    return result
