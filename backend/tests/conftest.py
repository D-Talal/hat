"""
Pytest fixtures for PropManager backend tests.

Uses an in-memory SQLite database so tests are isolated and fast, with the
get_db dependency overridden to point at the test session. Startup side
effects (create_all on the real Postgres engine, migrations, seeding, and the
alert scheduler) are skipped via the TESTING env var (see app/main.py guards).
"""
import os
import pytest

# Must be set BEFORE importing the app so startup side effects are skipped.
os.environ.setdefault("TESTING", "1")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("FIELD_ENCRYPTION_KEY", "")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.core.auth import create_access_token, hash_password
from app.models.organization import Organization
from app.models.user import User, UserRole


# ── In-memory SQLite, shared across the connection pool ───────────────────────
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Fresh schema for each test, dropped afterwards."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """TestClient with get_db overridden to the in-memory session."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Auth fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def test_org(db_session):
    org = Organization(
        name="Test Org", slug="test-org", plan="trial",
        is_validated=True, is_active=True,
        default_currency="EUR", country="FR", locale="fr-FR",
        timezone="Europe/Paris", area_unit="sqm",
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


def _make_user(db_session, org, role, email):
    user = User(
        organization_id=org.id,
        email=email,
        full_name=f"{role.value.title()} User",
        hashed_password=hash_password("password123"),
        role=role,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session, test_org):
    return _make_user(db_session, test_org, UserRole.admin, "admin@test.com")


@pytest.fixture
def viewer_user(db_session, test_org):
    return _make_user(db_session, test_org, UserRole.viewer, "viewer@test.com")


def auth_headers(user):
    """Build a Bearer token header for a given user."""
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}
