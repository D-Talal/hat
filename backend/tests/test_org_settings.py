"""Tests for organization i18n settings (GET/PUT /api/org-settings)."""
from tests.conftest import auth_headers


def test_get_org_settings(client, admin_user):
    r = client.get("/api/org-settings", headers=auth_headers(admin_user))
    assert r.status_code == 200
    body = r.json()
    assert body["default_currency"] == "EUR"
    assert body["locale"] == "fr-FR"


def test_update_org_settings(client, admin_user):
    r = client.put(
        "/api/org-settings",
        headers=auth_headers(admin_user),
        json={"default_currency": "GBP", "locale": "en-GB", "area_unit": "sqft"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["default_currency"] == "GBP"
    assert body["area_unit"] == "sqft"


def test_update_rejects_bad_currency(client, admin_user):
    r = client.put(
        "/api/org-settings",
        headers=auth_headers(admin_user),
        json={"default_currency": "XYZ"},
    )
    assert r.status_code == 400


def test_update_rejects_bad_area_unit(client, admin_user):
    r = client.put(
        "/api/org-settings",
        headers=auth_headers(admin_user),
        json={"area_unit": "acres"},
    )
    assert r.status_code == 400


def test_viewer_cannot_update_settings(client, viewer_user):
    r = client.put(
        "/api/org-settings",
        headers=auth_headers(viewer_user),
        json={"default_currency": "USD"},
    )
    assert r.status_code == 403


def test_settings_require_auth(client):
    r = client.get("/api/org-settings")
    assert r.status_code in (401, 403)
