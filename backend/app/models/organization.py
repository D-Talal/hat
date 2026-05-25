from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(255), nullable=False)
    slug         = Column(String(100), unique=True, nullable=False, index=True)
    plan         = Column(String(50), default="trial")   # trial | starter | pro | enterprise
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships (optional, for eager loading convenience)
    users = relationship("User", back_populates="organization", lazy="dynamic")
