"""Tests for contracts: creation, release rules, renewal, and space editing."""
from datetime import date
import pytest

from tests.conftest import auth_headers
from app.models.retail import (
    BusinessPartner, BusinessEntity, Contract, Condition,
    ContractStatus, ConditionType,
)


@pytest.fixture
def partner_and_entity(db_session, test_org):
    bp = BusinessPartner(org_id=test_org.id, bp_number="BP-001", company_name="Acme Retail")
    be = BusinessEntity(org_id=test_org.id, name="Main Mall")
    db_session.add_all([bp, be])
    db_session.commit()
    db_session.refresh(bp)
    db_session.refresh(be)
    return bp, be


def _make_contract(db_session, bp, be, status=ContractStatus.draft, number="LO-T1"):
    c = Contract(
        contract_number=number, business_partner_id=bp.id, business_entity_id=be.id,
        status=status, start_date=date(2026, 1, 1), absolute_end_date=date(2026, 12, 31),
    )
    db_session.add(c)
    db_session.commit()
    db_session.refresh(c)
    return c


def test_create_contract(client, admin_user, partner_and_entity):
    bp, be = partner_and_entity
    r = client.post(
        "/api/commercial/contracts",
        headers=auth_headers(admin_user),
        json={
            "business_partner_id": bp.id,
            "business_entity_id": be.id,
            "contract_type": "lease_out",
            "start_date": "2026-01-01",
            "absolute_end_date": "2026-12-31",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "draft"


def test_create_contract_blank_dates_ok(client, admin_user, partner_and_entity):
    # Regression: empty-string optional dates used to cause a 422 + blank page
    bp, be = partner_and_entity
    r = client.post(
        "/api/commercial/contracts",
        headers=auth_headers(admin_user),
        json={
            "business_partner_id": bp.id,
            "business_entity_id": be.id,
            "contract_type": "lease_out",
            "start_date": "2026-01-01",
            "first_end_date": "",
            "probable_end_date": "",
            "absolute_end_date": "",
        },
    )
    assert r.status_code == 200


def test_list_contracts_exposes_space_ids(client, admin_user, partner_and_entity):
    bp, be = partner_and_entity
    r = client.get("/api/commercial/contracts", headers=auth_headers(admin_user))
    assert r.status_code == 200
    # Each contract should carry a space_ids list (even if empty)
    for c in r.json():
        assert "space_ids" in c
        assert isinstance(c["space_ids"], list)


def test_release_requires_condition(client, db_session, admin_user, partner_and_entity):
    bp, be = partner_and_entity
    contract = _make_contract(db_session, bp, be, number="LO-REL1")
    # Without conditions → release must fail
    r = client.patch(
        f"/api/commercial/contracts/{contract.id}",
        headers=auth_headers(admin_user),
        json={"status": "released"},
    )
    assert r.status_code == 400


def test_release_succeeds_with_condition(client, db_session, admin_user, partner_and_entity):
    bp, be = partner_and_entity
    contract = _make_contract(db_session, bp, be, number="LO-REL2")
    db_session.add(Condition(
        contract_id=contract.id, condition_type=ConditionType.base_rent,
        valid_from=date(2026, 1, 1), amount=1000, currency="EUR",
    ))
    db_session.commit()
    r = client.patch(
        f"/api/commercial/contracts/{contract.id}",
        headers=auth_headers(admin_user),
        json={"status": "released"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "released"


def test_renew_contract_clones_into_draft(client, db_session, admin_user, partner_and_entity):
    bp, be = partner_and_entity
    contract = _make_contract(db_session, bp, be, status=ContractStatus.released, number="LO-SRC")
    contract.start_date = date(2025, 1, 1)
    contract.absolute_end_date = date(2025, 12, 31)
    db_session.commit()
    db_session.add(Condition(
        contract_id=contract.id, condition_type=ConditionType.base_rent,
        valid_from=date(2025, 1, 1), amount=2000, currency="EUR",
    ))
    db_session.commit()

    r = client.post(
        f"/api/commercial/contracts/{contract.id}/renew",
        headers=auth_headers(admin_user),
    )
    assert r.status_code == 200
    renewed = r.json()
    assert renewed["id"] != contract.id
    assert renewed["status"] == "draft"


def test_renew_missing_contract(client, admin_user):
    r = client.post("/api/commercial/contracts/99999/renew", headers=auth_headers(admin_user))
    assert r.status_code == 404


def test_cannot_edit_spaces_on_released(client, db_session, admin_user, partner_and_entity):
    # Regression: spaces are locked on released contracts
    bp, be = partner_and_entity
    contract = _make_contract(db_session, bp, be, status=ContractStatus.released, number="LO-LCK")
    r = client.patch(
        f"/api/commercial/contracts/{contract.id}",
        headers=auth_headers(admin_user),
        json={"space_ids": [1, 2]},
    )
    assert r.status_code == 400


# ── Amendments (avenants) ─────────────────────────────────────────────────────

def test_amend_draft_rejected(client, db_session, admin_user, partner_and_entity):
    """An amendment only applies to an active (released) contract."""
    bp, be = partner_and_entity
    contract = _make_contract(db_session, bp, be, status=ContractStatus.draft, number="LO-AMD-D")
    r = client.post(
        f"/api/commercial/contracts/{contract.id}/amend",
        headers=auth_headers(admin_user),
        json={"effective_date": "2026-06-01"},
    )
    assert r.status_code == 400


def test_amend_rent_change_creates_dated_condition(client, db_session, admin_user, partner_and_entity):
    bp, be = partner_and_entity
    contract = _make_contract(db_session, bp, be, status=ContractStatus.released, number="LO-AMD-R")
    db_session.add(Condition(
        contract_id=contract.id, condition_type=ConditionType.base_rent,
        valid_from=date(2026, 1, 1), amount=2000, currency="EUR",
    ))
    db_session.commit()

    r = client.post(
        f"/api/commercial/contracts/{contract.id}/amend",
        headers=auth_headers(admin_user),
        json={"effective_date": "2026-06-01", "new_rent": {"condition_type": "base_rent", "amount": 3000}},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["amendment_number"].startswith("AV-")

    # The old rent period is closed, a new one opens at the effective date
    conds = db_session.query(Condition).filter(
        Condition.contract_id == contract.id,
        Condition.condition_type == ConditionType.base_rent,
    ).all()
    assert len(conds) == 2
    amounts = sorted(float(c.amount) for c in conds)
    assert amounts == [2000, 3000]


def test_amend_extends_end_date(client, db_session, admin_user, partner_and_entity):
    bp, be = partner_and_entity
    contract = _make_contract(db_session, bp, be, status=ContractStatus.released, number="LO-AMD-E")
    r = client.post(
        f"/api/commercial/contracts/{contract.id}/amend",
        headers=auth_headers(admin_user),
        json={"effective_date": "2026-06-01", "new_end_date": "2027-12-31"},
    )
    assert r.status_code == 200
    db_session.refresh(contract)
    assert contract.absolute_end_date == date(2027, 12, 31)


def test_list_amendments(client, db_session, admin_user, partner_and_entity):
    bp, be = partner_and_entity
    contract = _make_contract(db_session, bp, be, status=ContractStatus.released, number="LO-AMD-L")
    client.post(
        f"/api/commercial/contracts/{contract.id}/amend",
        headers=auth_headers(admin_user),
        json={"effective_date": "2026-06-01", "reason": "Test", "new_end_date": "2027-01-01"},
    )
    r = client.get(
        f"/api/commercial/contracts/{contract.id}/amendments",
        headers=auth_headers(admin_user),
    )
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["reason"] == "Test"
