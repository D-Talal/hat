from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime
from app.database import get_db
from app.models.hotel import Hotel, Room, Guest, Booking, RoomStatus, BookingStatus
from app.models.audit import AuditLog
from app.core.deps import get_current_user, get_current_org
from app.core.permissions import require_permission

router = APIRouter()

try:
    from app.core.encryption import encrypt_field, decrypt_field
except ImportError:
    def encrypt_field(v): return v
    def decrypt_field(v): return v

def audit(db, user, action, resource, rid=None):
    db.add(AuditLog(
        user_id=user.id, user_email=user.email,
        action=action, resource=resource, resource_id=rid,
        org_id=getattr(user, 'organization_id', None)
    ))
    db.commit()

# ── SCHEMAS ────────────────────────────────────────────────────────────────────

class HotelCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    continent: Optional[str] = None
    star_rating: Optional[int] = None
    total_rooms: Optional[int] = None
    annual_revenue: Optional[float] = 0

class HotelOut(HotelCreate):
    id: int
    org_id: Optional[int] = None
    created_at: datetime
    class Config: from_attributes = True

class RoomCreate(BaseModel):
    room_number: str
    floor: Optional[int] = None
    room_type: Optional[str] = None
    bed_type: Optional[str] = None
    capacity: Optional[int] = 2
    area_sqft: Optional[float] = None
    base_rate: Optional[float] = None
    status: Optional[RoomStatus] = RoomStatus.available
    amenities: Optional[str] = None

class RoomOut(RoomCreate):
    id: int
    hotel_id: int
    class Config: from_attributes = True

class GuestCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    nationality: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None

class GuestOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    nationality: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
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
    status: Optional[BookingStatus] = BookingStatus.confirmed
    special_requests: Optional[str] = None

class BookingOut(BookingCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

# ── HOTELS ─────────────────────────────────────────────────────────────────────

@router.get("/hotels", response_model=List[HotelOut])
def list_hotels(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    return db.query(Hotel).filter(Hotel.org_id == org.id).all()

@router.post("/hotels", response_model=HotelOut)
def create_hotel(data: HotelCreate, db: Session = Depends(get_db), u=Depends(require_permission("create")), org=Depends(get_current_org)):
    obj = Hotel(**data.model_dump(), org_id=org.id)
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "hotels", obj.id)
    return obj

@router.put("/hotels/{id}", response_model=HotelOut)
def update_hotel(id: int, data: HotelCreate, db: Session = Depends(get_db), u=Depends(require_permission("update")), org=Depends(get_current_org)):
    obj = db.query(Hotel).filter(Hotel.id == id, Hotel.org_id == org.id).first()
    if not obj: raise HTTPException(404, "Hotel not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "hotels", obj.id)
    return obj

@router.delete("/hotels/{id}")
def delete_hotel(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    obj = db.query(Hotel).filter(Hotel.id == id, Hotel.org_id == org.id).first()
    if not obj: raise HTTPException(404, "Hotel not found")
    db.delete(obj); db.commit()
    audit(db, u, "DELETE", "hotels", id)
    return {"ok": True}

# ── ROOMS ──────────────────────────────────────────────────────────────────────

@router.get("/hotels/{hotel_id}/rooms", response_model=List[RoomOut])
def list_rooms(hotel_id: int, db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id, Hotel.org_id == org.id).first()
    if not hotel: raise HTTPException(404, "Hotel not found")
    return db.query(Room).filter(Room.hotel_id == hotel_id).all()

@router.post("/hotels/{hotel_id}/rooms", response_model=RoomOut)
def create_room(hotel_id: int, data: RoomCreate, db: Session = Depends(get_db), u=Depends(require_permission("create")), org=Depends(get_current_org)):
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id, Hotel.org_id == org.id).first()
    if not hotel: raise HTTPException(404, "Hotel not found")
    obj = Room(**data.model_dump(), hotel_id=hotel_id)
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "hotel_rooms", obj.id)
    return obj

@router.put("/rooms/{id}", response_model=RoomOut)
def update_room(id: int, data: RoomCreate, db: Session = Depends(get_db), u=Depends(require_permission("update")), org=Depends(get_current_org)):
    obj = db.query(Room).join(Hotel).filter(Room.id == id, Hotel.org_id == org.id).first()
    if not obj: raise HTTPException(404, "Room not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "hotel_rooms", obj.id)
    return obj

@router.delete("/rooms/{id}")
def delete_room(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    obj = db.query(Room).join(Hotel).filter(Room.id == id, Hotel.org_id == org.id).first()
    if not obj: raise HTTPException(404, "Room not found")
    db.delete(obj); db.commit()
    return {"ok": True}

# ── GUESTS ─────────────────────────────────────────────────────────────────────

def _decrypt_guest(g: Guest) -> dict:
    return {
        "id": g.id,
        "first_name": decrypt_field(g.first_name),
        "last_name": decrypt_field(g.last_name),
        "email": decrypt_field(g.email) if g.email else None,
        "phone": decrypt_field(g.phone) if g.phone else None,
        "nationality": g.nationality,
        "id_type": g.id_type,
        "id_number": decrypt_field(g.id_number) if g.id_number else None,
        "created_at": g.created_at,
    }

@router.get("/guests")
def list_guests(db: Session = Depends(get_db), u=Depends(get_current_user)):
    guests = db.query(Guest).all()
    return [_decrypt_guest(g) for g in guests]

@router.post("/guests")
def create_guest(data: GuestCreate, db: Session = Depends(get_db), u=Depends(require_permission("create"))):
    obj = Guest(
        first_name=encrypt_field(data.first_name),
        last_name=encrypt_field(data.last_name),
        email=encrypt_field(data.email) if data.email else None,
        phone=encrypt_field(data.phone) if data.phone else None,
        nationality=data.nationality,
        id_type=data.id_type,
        id_number=encrypt_field(data.id_number) if data.id_number else None,
    )
    db.add(obj); db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "hotel_guests", obj.id)
    return _decrypt_guest(obj)

@router.put("/guests/{id}")
def update_guest(id: int, data: GuestCreate, db: Session = Depends(get_db), u=Depends(require_permission("update"))):
    obj = db.query(Guest).filter(Guest.id == id).first()
    if not obj: raise HTTPException(404, "Guest not found")
    obj.first_name = encrypt_field(data.first_name)
    obj.last_name  = encrypt_field(data.last_name)
    obj.email      = encrypt_field(data.email) if data.email else None
    obj.phone      = encrypt_field(data.phone) if data.phone else None
    obj.nationality = data.nationality
    obj.id_type    = data.id_type
    obj.id_number  = encrypt_field(data.id_number) if data.id_number else None
    db.commit()
    audit(db, u, "UPDATE", "hotel_guests", obj.id)
    return _decrypt_guest(obj)

@router.delete("/guests/{id}")
def delete_guest(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete"))):
    obj = db.query(Guest).filter(Guest.id == id).first()
    if not obj: raise HTTPException(404, "Guest not found")
    db.delete(obj); db.commit()
    return {"ok": True}

# ── BOOKINGS ───────────────────────────────────────────────────────────────────

@router.get("/bookings")
def list_bookings(db: Session = Depends(get_db), u=Depends(get_current_user), org=Depends(get_current_org)):
    bookings = db.query(Booking).join(Room).join(Hotel).filter(Hotel.org_id == org.id).all()
    return bookings

@router.post("/bookings", response_model=BookingOut)
def create_booking(data: BookingCreate, db: Session = Depends(get_db), u=Depends(require_permission("create")), org=Depends(get_current_org)):
    # Validate room belongs to this org
    room = db.query(Room).join(Hotel).filter(Room.id == data.room_id, Hotel.org_id == org.id).first()
    if not room: raise HTTPException(404, "Room not found")
    obj = Booking(**data.model_dump())
    db.add(obj)
    # Update room status
    room.status = RoomStatus.occupied
    db.commit(); db.refresh(obj)
    audit(db, u, "CREATE", "hotel_bookings", obj.id)
    return obj

@router.put("/bookings/{id}", response_model=BookingOut)
def update_booking(id: int, data: BookingCreate, db: Session = Depends(get_db), u=Depends(require_permission("update")), org=Depends(get_current_org)):
    obj = db.query(Booking).join(Room).join(Hotel).filter(Booking.id == id, Hotel.org_id == org.id).first()
    if not obj: raise HTTPException(404, "Booking not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    if data.status == BookingStatus.checked_out:
        obj.room.status = RoomStatus.available
    db.commit(); db.refresh(obj)
    audit(db, u, "UPDATE", "hotel_bookings", obj.id)
    return obj

@router.delete("/bookings/{id}")
def delete_booking(id: int, db: Session = Depends(get_db), u=Depends(require_permission("delete")), org=Depends(get_current_org)):
    obj = db.query(Booking).join(Room).join(Hotel).filter(Booking.id == id, Hotel.org_id == org.id).first()
    if not obj: raise HTTPException(404, "Booking not found")
    obj.room.status = RoomStatus.available
    db.delete(obj); db.commit()
    return {"ok": True}
