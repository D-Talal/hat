import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine, Base, SessionLocal
from app.routers import auth, users, retail, hotel, register, pdf as pdf_router_module, alerts as alerts_router_module, csv_import as csv_import_router, super_admin as super_admin_router
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.routers import map as map_router
from app.routers.dashboard import router as dashboard_router
from app.routers.commercial import router as commercial_router
from app.routers.posting import router as posting_router
from app.routers.org_settings import router as org_settings_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.models.organization import Organization  # noqa — ensures Organization is registered in Base.metadata
Base.metadata.create_all(bind=engine)
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# ── Startup security checks ────────────────────────────────────────────────────
_FRONTEND_URL = os.getenv("FRONTEND_URL")
if ENVIRONMENT == "production":
    if not _FRONTEND_URL:
        raise RuntimeError("FRONTEND_URL environment variable must be set in production")
    if _FRONTEND_URL == "*":
        raise RuntimeError("FRONTEND_URL cannot be '*' in production")

_ALLOWED_ORIGINS = [_FRONTEND_URL] if _FRONTEND_URL else ["http://localhost:3000", "http://localhost:5173"]

app = FastAPI(title="PropManager API", version="2.0.0")

# ── Background alert scheduler ────────────────────────────────────────────────
_scheduler = BackgroundScheduler(timezone="UTC")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
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
    msg = str(exc) if ENVIRONMENT != "production" else "An internal error occurred."
    return JSONResponse(status_code=500, content={"detail": msg})

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(register.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(retail.router, prefix="/api/retail", tags=["retail"])
app.include_router(hotel.router, prefix="/api/hotel", tags=["hotel"])
app.include_router(map_router.router, prefix="/api/map", tags=["map"])
app.include_router(dashboard_router)
app.include_router(commercial_router, prefix="/api/commercial", tags=["commercial"])
app.include_router(posting_router, prefix="/api/posting", tags=["posting"])
app.include_router(pdf_router_module.router, prefix="/api/pdf", tags=["pdf"])
app.include_router(alerts_router_module.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(csv_import_router.router, prefix="/api/import", tags=["import"])
app.include_router(super_admin_router.router, prefix="/api/super-admin", tags=["super-admin"])
app.include_router(org_settings_router)

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
            # Multi-tenancy
            "CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL, plan VARCHAR(50) DEFAULT 'trial', is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())",
            "INSERT INTO organizations (name, slug, plan, is_active) SELECT 'Default', 'default', 'trial', true WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug='default')",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)",
            "UPDATE users SET organization_id = (SELECT id FROM organizations WHERE slug='default') WHERE organization_id IS NULL",
            "UPDATE organizations SET is_active = true WHERE is_active IS NULL",
            "ALTER TABLE re_business_entities ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(id)",
            "UPDATE re_business_entities SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL",
            "ALTER TABLE re_business_partners ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(id)",
            "UPDATE re_business_partners SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL",
            "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(id)",
            "UPDATE hotels SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL",
            "ALTER TABLE re_posting_runs ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(id)",
            "UPDATE re_posting_runs SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL",
            "ALTER TABLE re_fx_rates ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(id)",
            "UPDATE re_fx_rates SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL",
            # Hotels
            "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS city VARCHAR(255)",
            "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS country VARCHAR(255)",
            "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS continent VARCHAR(100)",
            "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS annual_revenue FLOAT DEFAULT 0",
            "ALTER TABLE hotel_guests ALTER COLUMN first_name TYPE TEXT",
            "ALTER TABLE hotel_guests ALTER COLUMN last_name TYPE TEXT",
            "ALTER TABLE hotel_guests ALTER COLUMN email TYPE TEXT",
            "ALTER TABLE hotel_guests ALTER COLUMN phone TYPE TEXT",
            "ALTER TABLE hotel_guests ALTER COLUMN id_number TYPE TEXT",
            "ALTER TABLE hotel_guests ALTER COLUMN id_type TYPE TEXT",
            "ALTER TABLE hotel_guests ALTER COLUMN nationality TYPE TEXT",
            "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(id)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false",
            "CREATE TABLE IF NOT EXISTS re_company_codes (id SERIAL PRIMARY KEY, org_id INTEGER REFERENCES organizations(id), code VARCHAR(20) NOT NULL, name VARCHAR(255) NOT NULL, currency VARCHAR(10) DEFAULT 'USD', country VARCHAR(100), description VARCHAR(500), created_at TIMESTAMPTZ DEFAULT now())",
            "ALTER TABLE re_business_entities ADD COLUMN IF NOT EXISTS company_code_id INTEGER REFERENCES re_company_codes(id)",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255)",
            # Internationalization settings (per-org defaults)
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'USD'",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'US'",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en-US'",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC'",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS area_unit VARCHAR(4) DEFAULT 'sqm'",
            "UPDATE organizations SET default_currency = 'USD' WHERE default_currency IS NULL",
            "UPDATE organizations SET country = 'US' WHERE country IS NULL",
            "UPDATE organizations SET locale = 'en-US' WHERE locale IS NULL",
            "UPDATE organizations SET timezone = 'UTC' WHERE timezone IS NULL",
            "UPDATE organizations SET area_unit = 'sqm' WHERE area_unit IS NULL",
            "UPDATE organizations SET is_validated = true WHERE slug = 'default' OR slug = 'propmanager'",
            # State / Province fields for geo tables
            "ALTER TABLE re_company_codes ADD COLUMN IF NOT EXISTS state VARCHAR(100)",
            "ALTER TABLE re_business_entities ADD COLUMN IF NOT EXISTS state VARCHAR(100)",
            "ALTER TABLE re_buildings ADD COLUMN IF NOT EXISTS state VARCHAR(100)",
            # Full geo fields for business partners
            "ALTER TABLE re_business_partners ADD COLUMN IF NOT EXISTS continent VARCHAR(100)",
            "ALTER TABLE re_business_partners ADD COLUMN IF NOT EXISTS state VARCHAR(100)",
            "ALTER TABLE re_business_partners ADD COLUMN IF NOT EXISTS address VARCHAR(500)",
            # Space absorbs RentalObject fields
            "ALTER TABLE re_spaces ADD COLUMN IF NOT EXISTS usage_type VARCHAR(100)",
            "ALTER TABLE re_spaces ADD COLUMN IF NOT EXISTS cost_center VARCHAR(100)",
            "ALTER TABLE re_spaces ADD COLUMN IF NOT EXISTS im_key VARCHAR(100)",
            # ContractObject: add space_id column (keep rental_object_id for migration)
            "ALTER TABLE re_contract_objects ADD COLUMN IF NOT EXISTS space_id INTEGER REFERENCES re_spaces(id)",
            # Migrate existing ContractObject data: space_id from rental_object's first space
            """
            UPDATE re_contract_objects co
            SET space_id = ros.space_id
            FROM re_rental_object_spaces ros
            WHERE ros.rental_object_id = co.rental_object_id
            AND co.space_id IS NULL
            AND EXISTS (SELECT 1 FROM re_rental_object_spaces ros2 WHERE ros2.rental_object_id = co.rental_object_id)
            """,
            # For contracts with no space assignment, try direct space from rental object's building
            # VacancyPosting: add space_id
            "ALTER TABLE re_vacancy_postings ADD COLUMN IF NOT EXISTS space_id INTEGER REFERENCES re_spaces(id)",
            "UPDATE re_vacancy_postings vp SET space_id = ros.space_id FROM re_rental_object_spaces ros WHERE ros.rental_object_id = vp.rental_object_id AND vp.space_id IS NULL",
            # SalesDeclaration: add space_id
            "ALTER TABLE re_sales_declarations ADD COLUMN IF NOT EXISTS space_id INTEGER REFERENCES re_spaces(id)",
            "UPDATE re_sales_declarations sd SET space_id = ros.space_id FROM re_rental_object_spaces ros WHERE ros.rental_object_id = sd.rental_object_id AND sd.space_id IS NULL",
            # MaintenanceRequest: add space_id
            "ALTER TABLE re_maintenance ADD COLUMN IF NOT EXISTS space_id INTEGER REFERENCES re_spaces(id)",
            "UPDATE re_maintenance m SET space_id = ros.space_id FROM re_rental_object_spaces ros WHERE ros.rental_object_id = m.rental_object_id AND m.space_id IS NULL",
            # Copy usage_type/cost_center/im_key from rental objects to their spaces
            "UPDATE re_spaces s SET usage_type = ro.usage_type, cost_center = ro.cost_center, im_key = ro.im_key FROM re_rental_object_spaces ros JOIN re_rental_objects ro ON ro.id = ros.rental_object_id WHERE ros.space_id = s.id AND s.usage_type IS NULL",
            # Posting entries: add space_id column
            "ALTER TABLE re_posting_entries ADD COLUMN IF NOT EXISTS space_id INTEGER REFERENCES re_spaces(id)",
            "UPDATE re_posting_entries pe SET space_id = co.space_id FROM re_contract_objects co WHERE co.id = pe.contract_id AND pe.space_id IS NULL",
            # ─────────────────────────────────────────────────────────────
            # ORG_ID BACKFILL — assign all orphaned (NULL org_id) rows to the
            # earliest organization. Eliminates the legacy-NULL bug class.
            # Only runs when exactly one org exists (safe single-tenant case)
            # or assigns to the lowest org id otherwise.
            # ─────────────────────────────────────────────────────────────
            "UPDATE re_company_codes SET org_id = (SELECT MIN(id) FROM organizations) WHERE org_id IS NULL AND EXISTS (SELECT 1 FROM organizations)",
            "UPDATE re_business_entities SET org_id = (SELECT MIN(id) FROM organizations) WHERE org_id IS NULL AND EXISTS (SELECT 1 FROM organizations)",
            "UPDATE re_business_partners SET org_id = (SELECT MIN(id) FROM organizations) WHERE org_id IS NULL AND EXISTS (SELECT 1 FROM organizations)",
            # Backfill company_code_id linkage on business entities missing it
            # (so the CC → BE chain is intact for org-scoped queries)
            "UPDATE re_business_entities be SET company_code_id = (SELECT MIN(cc.id) FROM re_company_codes cc WHERE cc.org_id = be.org_id) WHERE be.company_code_id IS NULL AND be.org_id IS NOT NULL AND EXISTS (SELECT 1 FROM re_company_codes cc2 WHERE cc2.org_id = be.org_id)",
            # Users without org → earliest org
            "UPDATE users SET organization_id = (SELECT MIN(id) FROM organizations) WHERE organization_id IS NULL AND EXISTS (SELECT 1 FROM organizations)",
        ]
        for migration in migrations:
            try:
                db.execute(text(migration)); db.commit()
            except Exception:
                db.rollback()
        if not db.query(User).first():
            from app.models.organization import Organization
            # Create default org for the seeded admin
            org = Organization(name="PropManager", slug="propmanager", plan="trial")
            db.add(org)
            db.flush()
            db.add(User(
                organization_id=org.id,
                email="admin@propmanager.com",
                full_name="System Admin",
                hashed_password=hash_password("Admin@1234"),
                role=UserRole.admin,
                is_active=True,
                must_change_password=True,
            ))
            db.commit()
    finally:
        db.close()

    # Start alert scheduler
    if not _scheduler.running:
        from app.services.alert_engine import (
            check_overdue_invoices,
            check_expiring_contracts,
            check_stale_maintenance,
            send_monthly_summaries,
        )
        _scheduler.add_job(check_overdue_invoices,    CronTrigger(hour=8,  minute=0), id="overdue_invoices",    replace_existing=True)
        _scheduler.add_job(check_expiring_contracts,  CronTrigger(hour=8,  minute=5), id="expiring_contracts",  replace_existing=True)
        _scheduler.add_job(check_stale_maintenance,   CronTrigger(hour=8,  minute=10), id="stale_maintenance",  replace_existing=True)
        _scheduler.add_job(send_monthly_summaries,    CronTrigger(hour=9,  minute=0), id="monthly_summary",     replace_existing=True)
        _scheduler.start()
        logger.info("[SCHEDULER] Alert scheduler started — jobs run daily at 08:00 UTC")
