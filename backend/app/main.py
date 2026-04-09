import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine, Base, SessionLocal
from app.routers import auth, users, retail, hotel
from app.routers import map as map_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

app = FastAPI(title="PropManager API", version="2.0.0")

# Temporarily wide open CORS so crashes are visible
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}  # Show error for debugging
    )

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(retail.router, prefix="/api/retail", tags=["retail"])
app.include_router(hotel.router, prefix="/api/hotel", tags=["hotel"])
app.include_router(map_router.router, prefix="/api/map", tags=["map"])

@app.get("/")
def root():
    return {"message": "PropManager API v2", "status": "running"}

@app.get("/health")
def health():
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy", "database": "connected"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unhealthy"})

@app.on_event("startup")
def startup():
    from app.models.user import User, UserRole
    from app.core.auth import hash_password
    from sqlalchemy import text

    db = SessionLocal()
    try:
        migrations = [
            "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS city VARCHAR(255)",
            "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS country VARCHAR(255)",
            "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS continent VARCHAR(100)",
            "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS annual_revenue FLOAT DEFAULT 0",
            "ALTER TABLE retail_properties ADD COLUMN IF NOT EXISTS city VARCHAR(255)",
            "ALTER TABLE retail_properties ADD COLUMN IF NOT EXISTS country VARCHAR(255)",
            "ALTER TABLE retail_properties ADD COLUMN IF NOT EXISTS continent VARCHAR(100)",
            "ALTER TABLE retail_properties ADD COLUMN IF NOT EXISTS annual_revenue FLOAT DEFAULT 0",
            "ALTER TABLE hotel_guests ALTER COLUMN first_name TYPE VARCHAR(500)",
            "ALTER TABLE hotel_guests ALTER COLUMN last_name TYPE VARCHAR(500)",
            "ALTER TABLE hotel_guests ALTER COLUMN email TYPE VARCHAR(500)",
            "ALTER TABLE hotel_guests ALTER COLUMN phone TYPE VARCHAR(500)",
            "ALTER TABLE hotel_guests ALTER COLUMN id_number TYPE VARCHAR(500)",
            "ALTER TABLE hotel_guests ALTER COLUMN nationality TYPE VARCHAR(255)",
        ]
        for migration in migrations:
            try:
                db.execute(text(migration))
                db.commit()
            except Exception as e:
                db.rollback()

        if not db.query(User).first():
            admin = User(
                email="admin@propmanager.com",
                full_name="System Admin",
                hashed_password=hash_password("Admin@1234"),
                role=UserRole.admin,
                is_active=True,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()
# Note: migrations are in startup()
