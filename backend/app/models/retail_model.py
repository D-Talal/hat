from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class LeaseStatus(str, enum.Enum):
    active = "active"
    expired = "expired"
    pending = "pending"
    terminated = "terminated"

class UnitStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"
    maintenance = "maintenance"

class MaintenanceStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"

class Property(Base):
    __tablename__ = "retail_properties"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500))
    city = Column(String(255))
    country = Column(String(255))
    continent = Column(String(100))
    total_area_sqft = Column(Float)
    annual_revenue = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    units = relationship("Unit", back_populates="property")

class Unit(Base):
    __tablename__ = "retail_units"
    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("retail_properties.id"))
    unit_number = Column(String(50), nullable=False)
    floor = Column(Integer)
    area_sqft = Column(Float)
    unit_type = Column(String(100))
    status = Column(Enum(UnitStatus), default=UnitStatus.available)
    monthly_rent = Column(Float)
    property = relationship("Property", back_populates="units")
    tenants = relationship("Tenant", back_populates="unit")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="unit")

class Tenant(Base):
    __tablename__ = "retail_tenants"
    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("retail_units.id"))
    business_name = Column(String(255), nullable=False)
    contact_name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    lease_start = Column(Date)
    lease_end = Column(Date)
    lease_status = Column(Enum(LeaseStatus), default=LeaseStatus.active)
    monthly_rent = Column(Float)
    security_deposit = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    unit = relationship("Unit", back_populates="tenants")
    invoices = relationship("Invoice", back_populates="tenant")

class Invoice(Base):
    __tablename__ = "retail_invoices"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("retail_tenants.id"))
    amount = Column(Float, nullable=False)
    due_date = Column(Date)
    paid_date = Column(Date, nullable=True)
    status = Column(String(50), default="pending")
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    tenant = relationship("Tenant", back_populates="invoices")

class MaintenanceRequest(Base):
    __tablename__ = "retail_maintenance"
    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("retail_units.id"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    priority = Column(String(50), default="medium")
    status = Column(Enum(MaintenanceStatus), default=MaintenanceStatus.open)
    reported_by = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    unit = relationship("Unit", back_populates="maintenance_requests")
