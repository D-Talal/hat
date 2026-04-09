import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/realestate")

# Enforce SSL in production
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

connect_args = {}
engine_kwargs = {}

if ENVIRONMENT == "production" and "sslmode" not in DATABASE_URL:
    # Add SSL for Render PostgreSQL
    DATABASE_URL = DATABASE_URL + "?sslmode=require"

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,  # Recycle connections every 30 min
    pool_pre_ping=True,  # Test connection health before use
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
