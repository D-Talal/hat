from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime
from app.database import get_db
from app.models.hotel import Hotel, Room, Guest, Booking
from app.models.audit import AuditLog
from app.core.deps import get_current_user
from app.core.permissions import require_permission

router = APIRouter()

def audit(db, user, action, resource, rid=None):
    db.add(AuditLog(user_id=user.id, user_email=user.email, action=action, resource=resource, resource_id=rid))
    db.commit()

class HotelCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    continent: Optional[str] = None
    star_rating: Optional[int] = None
    total_rooms: Optional[int] = None
    annual_revenue: Optional[float] = None

class HotelOut(HotelCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class RoomCreate(BaseModel):
    hotel_id: int
    room_number: str
    floor: Optional[int] = None
    room_type: Optional[str] = None
    bed_type: Optional[str] = None
    capacity: Optional[int] = 2
    area_sqft: Optional[float] = None
    base_rate: Optional[float] = None
    status: Optional[str] = "available"
    amenities: Optional[str] = None

class RoomOut(RoomCreate):
    id: int
    class Config: from_attributes = True

class GuestCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    nationality: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None

class GuestOut(GuestCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class BookingCreate(BaseModel):
    room_id: int
    guest_id: int
    check_in: date
    check_out: date
    adults: Optional[int] = 1
    children: Optional[int] = 0
    total_amount: Optional[float] = None
    paid_amount: Optional[float] = 0
    status: Optional[str] = "confirmed"
    special_requests: Optional[str] = None

class BookingOut(BookingCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

@router.get("/hotels", response_model=List[HotelOut])
def list_hotels(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.query(Hotel).all()

@router.post("/hotels", response_model=HotelOut)
def create_hotel(data: HotelCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = Hotel(**data.dict()); db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "hotels", obj.id); return obj

@router.put("/hotels/{id}", response_model=HotelOut)
def update_hotel(id: int, data: HotelCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Hotel).filter(Hotel.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/hotels/{id}")
def delete_hotel(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Hotel).filter(Hotel.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

@router.get("/rooms", response_model=List[RoomOut])
def list_rooms(hotel_id: Optional[int] = None, db: Session = Depends(get_db), u=Depends(get_current_user)):
    q = db.query(Room)
    if hotel_id: q = q.filter(Room.hotel_id == hotel_id)
    return q.all()

@router.post("/rooms", response_model=RoomOut)
def create_room(data: RoomCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = Room(**data.dict()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.put("/rooms/{id}", response_model=RoomOut)
def update_room(id: int, data: RoomCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Room).filter(Room.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/rooms/{id}")
def delete_room(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Room).filter(Room.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

@router.get("/guests", response_model=List[GuestOut])
def list_guests(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.query(Guest).all()

@router.post("/guests", response_model=GuestOut)
def create_guest(data: GuestCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = Guest(**data.dict()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.put("/guests/{id}", response_model=GuestOut)
def update_guest(id: int, data: GuestCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Guest).filter(Guest.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/guests/{id}")
def delete_guest(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Guest).filter(Guest.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

@router.get("/bookings", response_model=List[BookingOut])
def list_bookings(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.query(Booking).all()

@router.post("/bookings", response_model=BookingOut)
def create_booking(data: BookingCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = Booking(**data.dict()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.put("/bookings/{id}", response_model=BookingOut)
def update_booking(id: int, data: BookingCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Booking).filter(Booking.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@router.delete("/bookings/{id}")
def delete_booking(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Booking).filter(Booking.id == id).first()
    if not obj: raise HTTPException(404, "Not found")
    db.delete(obj); db.commit(); return {"ok": True}

@router.get("/stats")
def hotel_stats(db: Session = Depends(get_db), u=Depends(get_current_user)):
    total_rooms = db.query(Room).count()
    occupied = db.query(Room).filter(Room.status == "occupied").count()
    available = db.query(Room).filter(Room.status == "available").count()
    total_guests = db.query(Guest).count()
    active_bookings = db.query(Booking).filter(Booking.status.in_(["confirmed", "checked_in"])).count()
    total_revenue = db.query(func.sum(Booking.paid_amount)).scalar() or 0
    return {
        "total_rooms": total_rooms, "occupied_rooms": occupied, "available_rooms": available,
        "occupancy_rate": round((occupied / total_rooms * 100) if total_rooms else 0, 1),
        "total_guests": total_guests, "active_bookings": active_bookings, "total_revenue": total_revenue,
    }
