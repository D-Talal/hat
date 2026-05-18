from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class RoomStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"
    maintenance = "maintenance"
    reserved = "reserved"

class BookingStatus(str, enum.Enum):
    confirmed = "confirmed"
    checked_in = "checked_in"
    checked_out = "checked_out"
    cancelled = "cancelled"

class Hotel(Base):
    __tablename__ = "hotels"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500))
    city = Column(String(255))
    country = Column(String(255))
    continent = Column(String(100))
    star_rating = Column(Integer)
    total_rooms = Column(Integer)
    annual_revenue = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    rooms = relationship("Room", back_populates="hotel")

class Room(Base):
    __tablename__ = "hotel_rooms"
    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"))
    room_number = Column(String(20), nullable=False)
    floor = Column(Integer)
    room_type = Column(String(100))
    bed_type = Column(String(100))
    capacity = Column(Integer, default=2)
    area_sqft = Column(Float)
    base_rate = Column(Float)
    status = Column(Enum(RoomStatus), default=RoomStatus.available)
    amenities = Column(Text)
    hotel = relationship("Hotel", back_populates="rooms")
    bookings = relationship("Booking", back_populates="room")

class Guest(Base):
    __tablename__ = "hotel_guests"
    id = Column(Integer, primary_key=True, index=True)
    # Text columns to accommodate Fernet-encrypted values (~100+ chars)
    first_name = Column(Text, nullable=False)
    last_name = Column(Text, nullable=False)
    email = Column(Text)
    phone = Column(Text)
    nationality = Column(String(100))
    id_type = Column(String(50))
    id_number = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    bookings = relationship("Booking", back_populates="guest")

class Booking(Base):
    __tablename__ = "hotel_bookings"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("hotel_rooms.id"))
    guest_id = Column(Integer, ForeignKey("hotel_guests.id"))
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    adults = Column(Integer, default=1)
    children = Column(Integer, default=0)
    total_amount = Column(Float)
    paid_amount = Column(Float, default=0)
    status = Column(Enum(BookingStatus), default=BookingStatus.confirmed)
    special_requests = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    room = relationship("Room", back_populates="bookings")
    guest = relationship("Guest", back_populates="bookings")
