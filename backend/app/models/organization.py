from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Organization(Base):
    __tablename__ = "organizations"
    __table_args__ = {'extend_existing': True}

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(255), nullable=False)
    slug         = Column(String(100), unique=True, nullable=False, index=True)
    plan         = Column(String(50), default="trial")   # trial | starter | pro | enterprise
    is_active    = Column(Boolean, default=True)
    is_validated = Column(Boolean, default=False)  # must be True to log in
    contact_email= Column(String(255), nullable=True)  # admin's email for notifications

    # ── Internationalization settings (per-org defaults) ──
    default_currency = Column(String(3),  default="USD",   nullable=False)  # ISO 4217, e.g. EUR, GBP, CAD
    country          = Column(String(2),  default="US",    nullable=False)  # ISO 3166-1 alpha-2
    locale           = Column(String(10), default="en-US", nullable=False)  # BCP 47, e.g. fr-FR, de-DE
    timezone         = Column(String(50), default="UTC",   nullable=False)  # IANA, e.g. Europe/Paris
    area_unit        = Column(String(4),  default="sqm",   nullable=False)  # sqm | sqft

    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships (optional, for eager loading convenience)
    users = relationship("User", back_populates="organization", lazy="dynamic")
