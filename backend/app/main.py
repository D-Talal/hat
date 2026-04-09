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

app = FastAPI(
    title="PropManager API",
    version="2.0.0",
    # Disable docs in production
    docs_url="/docs" if ENVIRONMENT != "production" else None,
    redoc_url=None,
)

# --- CORS: locked to specific origins ---
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:80"
    ).split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# --- Security headers ---
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Cache-Control"] = "no-store"
    return response

# --- Global error handler: never expose stack traces in production ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred." if ENVIRONMENT == "production" else str(exc)}
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
        return JSONResponse(status_code=503, content={"status": "unhealthy", "database": "disconnected"})

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
        ]
        for migration in migrations:
            try:
                db.execute(text(migration))
                db.commit()
            except Exception as e:
                db.rollback()
                logger.debug(f"Migration skipped: {e}")

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
            logger.info("✅ Default admin created")
    finally:
        db.close()
