"""Tests for authentication: login, token validation, /me."""
from tests.conftest import auth_headers


def test_login_success(client, admin_user):
    r = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "password123"})
    assert r.status_code == 200
    body = r.json()
    assert body["requires_2fa"] is False
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password(client, admin_user):
    r = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "wrong"})
    assert r.status_code == 401


def test_login_unknown_email(client, admin_user):
    r = client.post("/api/auth/login", json={"email": "ghost@test.com", "password": "password123"})
    assert r.status_code == 401


def test_login_inactive_user(client, db_session, admin_user):
    admin_user.is_active = False
    db_session.commit()
    r = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "password123"})
    assert r.status_code == 403


def test_me_requires_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code in (401, 403)


def test_me_returns_user_and_org(client, admin_user):
    r = client.get("/api/auth/me", headers=auth_headers(admin_user))
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "admin@test.com"


def test_invalid_token_rejected(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code == 401
