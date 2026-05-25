from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    admin      = "admin"
    manager    = "manager"
    viewer     = "viewer"
    accountant = "accountant"

class User(Base):
    __tablename__ = "users"

    id                = Column(Integer, primary_key=True, index=True)
    organization_id   = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    email             = Column(String(255), unique=True, nullable=False, index=True)
    full_name         = Column(String(255))
    hashed_password   = Column(String(500), nullable=False)
    role              = Column(Enum(UserRole), default=UserRole.viewer)
    is_active         = Column(Boolean, default=True)
    totp_secret       = Column(String(100), nullable=True)
    totp_enabled      = Column(Boolean, default=False)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    last_login        = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization", back_populates="users")
