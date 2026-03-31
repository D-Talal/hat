from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.routers import auth, users, retail, hotel
from app.routers import map as map_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PropManager API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
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
    return {"status": "healthy"}

@app.on_event("startup")
def startup():
    from app.models.user import User, UserRole
    from app.core.auth import hash_password
    from sqlalchemy import text

    db = SessionLocal()
    try:
        # Run migrations for new columns
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
                print(f"Migration skipped: {e}")

        # Seed admin
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
            print("✅ Default admin created: admin@propmanager.com / Admin@1234")
    finally:
        db.close()
