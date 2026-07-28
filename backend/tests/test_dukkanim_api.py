"""Backend API tests for Dükkanım product & label app."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bulk-labels.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@dukkanim.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------- Auth ----------------
def test_login_success():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["role"] == "admin"
    assert isinstance(body["token"], str) and len(body["token"]) > 20


def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
    assert r.status_code == 401


def test_products_requires_auth():
    r = requests.get(f"{API}/products", timeout=30)
    assert r.status_code == 401


def test_auth_me(auth_headers):
    r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


# ---------------- Products CRUD ----------------
def test_list_products_seeded(auth_headers):
    r = requests.get(f"{API}/products", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    prods = r.json()
    assert isinstance(prods, list)
    assert len(prods) >= 6  # seeded
    # Turkish sample presence
    names = [p["name"] for p in prods]
    assert any("Bal" in n or "Kahve" in n or "Zeytinyağı" in n for n in names)
    # _id serialized as string in "id" alias field (Product model uses id aliased from _id)
    first = prods[0]
    assert "id" in first or "_id" in first


def test_product_create_get_update_delete(auth_headers):
    payload = {"name": "TEST_Kırmızı Biber", "price": 12.5, "stock": 5, "sku": "TEST-BBR"}
    r = requests.post(f"{API}/products", headers=auth_headers, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    created = r.json()
    pid = created.get("id") or created.get("_id")
    assert pid
    assert created["name"] == payload["name"]
    assert created["price"] == 12.5

    # verify in list
    r2 = requests.get(f"{API}/products", headers=auth_headers, timeout=30)
    assert r2.status_code == 200
    all_names = [p["name"] for p in r2.json()]
    assert payload["name"] in all_names

    # update
    upd = {"name": "TEST_Kırmızı Biber Güncel", "price": 14.0, "stock": 8, "sku": "TEST-BBR2"}
    r3 = requests.put(f"{API}/products/{pid}", headers=auth_headers, json=upd, timeout=30)
    assert r3.status_code == 200
    assert r3.json()["price"] == 14.0
    assert r3.json()["name"] == upd["name"]

    # delete
    r4 = requests.delete(f"{API}/products/{pid}", headers=auth_headers, timeout=30)
    assert r4.status_code == 200
    assert r4.json().get("ok") is True

    # deleting again -> 404
    r5 = requests.delete(f"{API}/products/{pid}", headers=auth_headers, timeout=30)
    assert r5.status_code == 404


def test_csv_import(auth_headers):
    csv_text = "name,price,stock,sku\nTEST_CSV_Un,15.5,10,TEST-UN\nTEST_CSV_Şeker,22.0,20,TEST-SEK\n"
    files = {"file": ("test.csv", io.BytesIO(csv_text.encode("utf-8")), "text/csv")}
    r = requests.post(f"{API}/products/import", headers=auth_headers, files=files, timeout=30)
    assert r.status_code == 200, r.text
    assert r.json()["inserted"] == 2

    # verify present and cleanup
    r2 = requests.get(f"{API}/products", headers=auth_headers, timeout=30)
    prods = r2.json()
    for p in prods:
        if p["name"].startswith("TEST_CSV_"):
            pid = p.get("id") or p.get("_id")
            requests.delete(f"{API}/products/{pid}", headers=auth_headers, timeout=30)
