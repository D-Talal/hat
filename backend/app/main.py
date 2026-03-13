from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.routers import auth, users, retail, hotel

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PropManager API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(retail.router, prefix="/api/retail", tags=["retail"])
app.include_router(hotel.router, prefix="/api/hotel", tags=["hotel"])

@app.get("/")
def root():
    return {"message": "PropManager API v2", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.on_event("startup")
def seed_admin():
    """Create default admin user if none exists."""
    from app.models.user import User, UserRole
    from app.core.auth import hash_password
    db = SessionLocal()
    try:
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
