from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.hotel import Hotel, Room, Booking
from app.models.retail import Property, Unit, Tenant
from app.core.deps import get_current_user

router = APIRouter()

CONTINENT_MAP = {
    'USA': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
    'Costa Rica': 'North America', 'Panama': 'North America', 'Dominican Republic': 'North America',
    'Jamaica': 'North America', 'Cuba': 'North America', 'Puerto Rico': 'North America',
    'Brazil': 'South America', 'Argentina': 'South America', 'Colombia': 'South America',
    'Chile': 'South America', 'Peru': 'South America', 'Venezuela': 'South America',
    'Ecuador': 'South America', 'Uruguay': 'South America', 'Bolivia': 'South America',
    'France': 'Europe', 'Germany': 'Europe', 'UK': 'Europe', 'Spain': 'Europe',
    'Italy': 'Europe', 'Portugal': 'Europe', 'Netherlands': 'Europe', 'Belgium': 'Europe',
    'Switzerland': 'Europe', 'Austria': 'Europe', 'Greece': 'Europe', 'Poland': 'Europe',
    'Sweden': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe',
    'Ireland': 'Europe', 'Czech Republic': 'Europe', 'Hungary': 'Europe', 'Romania': 'Europe',
    'Croatia': 'Europe', 'Serbia': 'Europe', 'Bulgaria': 'Europe',
    'South Africa': 'Africa', 'Nigeria': 'Africa', 'Kenya': 'Africa', 'Egypt': 'Africa',
    'Morocco': 'Africa', 'Tanzania': 'Africa', 'Ghana': 'Africa', 'Ethiopia': 'Africa',
    'Tunisia': 'Africa', 'Senegal': 'Africa', 'Ivory Coast': 'Africa',
    'UAE': 'Middle East', 'Saudi Arabia': 'Middle East', 'Qatar': 'Middle East',
    'Kuwait': 'Middle East', 'Bahrain': 'Middle East', 'Oman': 'Middle East',
    'Jordan': 'Middle East', 'Lebanon': 'Middle East', 'Turkey': 'Middle East',
    'Israel': 'Middle East', 'Iraq': 'Middle East',
    'China': 'Asia Pacific', 'Japan': 'Asia Pacific', 'South Korea': 'Asia Pacific',
    'Singapore': 'Asia Pacific', 'Thailand': 'Asia Pacific', 'India': 'Asia Pacific',
    'Indonesia': 'Asia Pacific', 'Malaysia': 'Asia Pacific', 'Philippines': 'Asia Pacific',
    'Vietnam': 'Asia Pacific', 'Australia': 'Asia Pacific', 'New Zealand': 'Asia Pacific',
    'Hong Kong': 'Asia Pacific', 'Taiwan': 'Asia Pacific', 'Myanmar': 'Asia Pacific',
    'Cambodia': 'Asia Pacific', 'Bangladesh': 'Asia Pacific', 'Pakistan': 'Asia Pacific',
}

def build_country_data(country, continent, revenue, count):
    return {"revenue": revenue, "count": count, "continent": continent}

@router.get("/stats")
def map_stats(module: str = "hotel", db: Session = Depends(get_db), u=Depends(get_current_user)):
    by_country = {}

    if module == "hotel":
        hotels = db.query(Hotel).all()
        for h in hotels:
            country = (h.country or "Unknown").strip()
            continent = (h.continent or CONTINENT_MAP.get(country, "Other")).strip()

            # Use annual_revenue if set, else sum paid bookings
            revenue = h.annual_revenue or 0
            if not revenue:
                paid = (db.query(func.sum(Booking.paid_amount))
                        .join(Room, Booking.room_id == Room.id)
                        .filter(Room.hotel_id == h.id)
                        .scalar()) or 0
                revenue = float(paid)

            if country not in by_country:
                by_country[country] = {"revenue": 0.0, "count": 0, "continent": continent}
            by_country[country]["revenue"] += revenue
            by_country[country]["count"] += 1

    else:
        properties = db.query(Property).all()
        for p in properties:
            country = (p.country or "Unknown").strip()
            continent = (p.continent or CONTINENT_MAP.get(country, "Other")).strip()

            revenue = p.annual_revenue or 0
            if not revenue:
                monthly = (db.query(func.sum(Tenant.monthly_rent))
                           .join(Unit, Tenant.unit_id == Unit.id)
                           .filter(Unit.property_id == p.id, Tenant.lease_status == "active")
                           .scalar()) or 0
                revenue = float(monthly) * 12

            if country not in by_country:
                by_country[country] = {"revenue": 0.0, "count": 0, "continent": continent}
            by_country[country]["revenue"] += revenue
            by_country[country]["count"] += 1

    # Aggregate by continent
    by_continent = {}
    for country, data in by_country.items():
        cont = data["continent"]
        if cont not in by_continent:
            by_continent[cont] = {"revenue": 0.0, "count": 0, "countries": []}
        by_continent[cont]["revenue"] += data["revenue"]
        by_continent[cont]["count"] += data["count"]
        by_continent[cont]["countries"].append(country)

    return {"by_country": by_country, "by_continent": by_continent}
