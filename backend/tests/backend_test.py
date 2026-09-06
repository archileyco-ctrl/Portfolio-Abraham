"""Backend tests for architecture portfolio app.
Covers: auth (login/passcode change), about content CRUD, projects CRUD & reorder,
uploads with compression, and the new 'work' world section.
"""
import io
import os
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://spatial-editor.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Passcode current state (per task, should be abearch4231)
PASSCODE = "abearch4231"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"passcode": PASSCODE})
    if r.status_code != 200:
        # Try older passcode as fallback
        r2 = requests.post(f"{API}/auth/login", json={"passcode": "atelier2026"})
        if r2.status_code == 200:
            pytest.fail(f"Passcode is still 'atelier2026' not '{PASSCODE}' - migration may not have been done")
        pytest.fail(f"Login failed: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# --- Auth ---
class TestAuth:
    def test_login_wrong_passcode(self):
        r = requests.post(f"{API}/auth/login", json={"passcode": "wrongxyz"})
        assert r.status_code == 401

    def test_login_correct(self, token):
        assert isinstance(token, str) and len(token) > 20

    def test_verify_valid(self, auth):
        r = requests.get(f"{API}/auth/verify", headers=auth)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_verify_invalid(self):
        r = requests.get(f"{API}/auth/verify", headers={"Authorization": "Bearer bad"})
        assert r.status_code == 401


# --- About content ---
class TestAbout:
    def test_get_about_public(self):
        r = requests.get(f"{API}/about")
        assert r.status_code == 200
        data = r.json()
        assert "intro" in data
        assert "bio" in data
        assert "facts" in data
        assert "email" in data

    def test_update_about_requires_auth(self):
        r = requests.put(f"{API}/admin/about", json={"intro": "x"})
        assert r.status_code == 401

    def test_update_about_and_persist(self, auth):
        # Get current
        current = requests.get(f"{API}/about").json()
        payload = {
            "intro": "TEST_intro line",
            "bio": ["TEST_bio para 1", "TEST_bio para 2"],
            "facts": [{"label": "TEST_Label", "value": "TEST_Value"}],
            "email": "test@test.com",
            "instagram": "@test_ig",
        }
        r = requests.put(f"{API}/admin/about", json=payload, headers=auth)
        assert r.status_code == 200
        # verify persistence via public GET
        r2 = requests.get(f"{API}/about")
        d = r2.json()
        assert d["intro"] == "TEST_intro line"
        assert d["email"] == "test@test.com"
        assert d["facts"][0]["label"] == "TEST_Label"

        # restore original (strip id if present)
        restore = {k: current.get(k, "") for k in ["intro", "bio", "facts", "email", "instagram"]}
        requests.put(f"{API}/admin/about", json=restore, headers=auth)


# --- Projects CRUD ---
class TestProjects:
    def test_list_public(self):
        r = requests.get(f"{API}/projects")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_by_world_anomaly(self):
        r = requests.get(f"{API}/projects", params={"world": "anomaly"})
        assert r.status_code == 200
        for p in r.json():
            assert p["world"] == "anomaly"

    def test_list_by_world_work(self):
        # May be empty initially
        r = requests.get(f"{API}/projects", params={"world": "work"})
        assert r.status_code == 200

    def test_admin_list_requires_auth(self):
        r = requests.get(f"{API}/admin/projects")
        assert r.status_code == 401

    def test_create_work_project_crud(self, auth):
        payload = {
            "title": "TEST_Work Supervision Project",
            "world": "work",
            "category": "Supervisor",
            "year": "2025",
            "summary": "Test work project",
            "published": True,
        }
        r = requests.post(f"{API}/admin/projects", json=payload, headers=auth)
        assert r.status_code == 200, r.text
        proj = r.json()
        assert proj["world"] == "work"
        assert proj["category"] == "Supervisor"
        pid = proj["id"]
        slug = proj["slug"]

        # public retrieval since published=True
        r2 = requests.get(f"{API}/projects/{slug}")
        assert r2.status_code == 200
        assert r2.json()["title"] == "TEST_Work Supervision Project"

        # appears in work list
        rl = requests.get(f"{API}/projects", params={"world": "work"})
        assert any(p["id"] == pid for p in rl.json())

        # update
        upd = dict(payload)
        upd["title"] = "TEST_Work Updated"
        upd["category"] = "Building Design"
        r3 = requests.put(f"{API}/admin/projects/{pid}", json=upd, headers=auth)
        assert r3.status_code == 200
        assert r3.json()["title"] == "TEST_Work Updated"
        assert r3.json()["category"] == "Building Design"

        # delete
        r4 = requests.delete(f"{API}/admin/projects/{pid}", headers=auth)
        assert r4.status_code == 200

        # verify gone
        r5 = requests.get(f"{API}/projects/{r3.json()['slug']}")
        assert r5.status_code == 404

    def test_reorder(self, auth):
        r = requests.get(f"{API}/admin/projects", headers=auth)
        assert r.status_code == 200
        all_projects = r.json()
        anomaly = [p for p in all_projects if p["world"] == "anomaly"]
        if len(anomaly) < 2:
            pytest.skip("Not enough anomaly projects to test reorder")
        original_ids = [p["id"] for p in anomaly]
        reversed_ids = list(reversed(original_ids))
        r2 = requests.post(f"{API}/admin/projects/reorder", json={"ids": reversed_ids}, headers=auth)
        assert r2.status_code == 200

        # verify order changed
        r3 = requests.get(f"{API}/admin/projects", headers=auth)
        new_order = [p["id"] for p in r3.json() if p["world"] == "anomaly"]
        assert new_order == reversed_ids

        # restore
        requests.post(f"{API}/admin/projects/reorder", json={"ids": original_ids}, headers=auth)


# --- Uploads ---
class TestUploads:
    def test_upload_requires_auth(self):
        r = requests.post(f"{API}/admin/uploads", files={"files": ("t.jpg", b"x", "image/jpeg")})
        assert r.status_code == 401

    def test_upload_and_compression(self, auth):
        # Create a 3000x3000 image which should be resized to 2400
        img = Image.new("RGB", (3000, 3000), color=(255, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=95)
        original_size = len(buf.getvalue())
        buf.seek(0)

        r = requests.post(
            f"{API}/admin/uploads",
            files={"files": ("test.jpg", buf.getvalue(), "image/jpeg")},
            headers=auth,
        )
        assert r.status_code == 200, r.text
        urls = r.json()["urls"]
        assert len(urls) == 1
        url = urls[0]
        assert url.startswith("/api/uploads/")

        # verify accessible via public URL
        r2 = requests.get(f"{BASE_URL}{url}")
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/")

        # verify compression - file should be smaller than original AND image should be <=2400
        served_img = Image.open(io.BytesIO(r2.content))
        assert max(served_img.size) <= 2400, f"Image not resized: {served_img.size}"
        assert len(r2.content) < original_size


# --- Home Intro (new) ---
class TestHomeIntro:
    def test_get_home_intro_public(self):
        r = requests.get(f"{API}/home-intro")
        assert r.status_code == 200
        d = r.json()
        assert "bg_image" in d

    def test_put_home_intro_requires_auth(self):
        r = requests.put(f"{API}/admin/home-intro", json={"bg_image": "x"})
        assert r.status_code == 401

    def test_put_home_intro_and_persist(self, auth):
        current = requests.get(f"{API}/home-intro").json()
        payload = {"bg_image": "/api/uploads/TEST_bg.jpg"}
        r = requests.put(f"{API}/admin/home-intro", json=payload, headers=auth)
        assert r.status_code == 200
        assert r.json()["bg_image"] == payload["bg_image"]
        # persistence via public GET
        d = requests.get(f"{API}/home-intro").json()
        assert d["bg_image"] == payload["bg_image"]
        # restore
        requests.put(f"{API}/admin/home-intro", json={"bg_image": current.get("bg_image", "")}, headers=auth)


# --- Image ratio/crop fields ---
class TestImageRatioCrop:
    def test_create_project_with_ratio_crop(self, auth):
        payload = {
            "title": "TEST_Ratio Project",
            "world": "anomaly",
            "published": True,
            "images": [
                {"url": "/api/uploads/a.jpg", "caption": "c1", "ratio": "1:1", "crop": True},
                {"url": "/api/uploads/b.jpg", "caption": "c2", "ratio": "16:9", "crop": False},
                {"url": "/api/uploads/c.jpg", "caption": "c3"},  # defaults
            ],
        }
        r = requests.post(f"{API}/admin/projects", json=payload, headers=auth)
        assert r.status_code == 200, r.text
        proj = r.json()
        pid = proj["id"]
        try:
            assert proj["images"][0]["ratio"] == "1:1"
            assert proj["images"][0]["crop"] is True
            assert proj["images"][1]["ratio"] == "16:9"
            assert proj["images"][1]["crop"] is False
            # defaults
            assert proj["images"][2]["ratio"] == "auto"
            assert proj["images"][2]["crop"] is False
            # persistence via public GET
            pub = requests.get(f"{API}/projects/{proj['slug']}").json()
            assert pub["images"][0]["ratio"] == "1:1"
            assert pub["images"][0]["crop"] is True
        finally:
            requests.delete(f"{API}/admin/projects/{pid}", headers=auth)


# --- Passcode change ---
class TestPasscodeChange:
    def test_change_passcode_wrong_current(self, auth):
        r = requests.post(
            f"{API}/admin/change-passcode",
            json={"current_passcode": "wrongxyz", "new_passcode": "somethingnew"},
            headers=auth,
        )
        assert r.status_code == 401

    def test_change_passcode_flow_and_restore(self, auth):
        temp = "testpass123"
        # Change to temp
        r = requests.post(
            f"{API}/admin/change-passcode",
            json={"current_passcode": PASSCODE, "new_passcode": temp},
            headers=auth,
        )
        assert r.status_code == 200, r.text

        # Old should no longer work
        r_old = requests.post(f"{API}/auth/login", json={"passcode": PASSCODE})
        assert r_old.status_code == 401

        # New works
        r_new = requests.post(f"{API}/auth/login", json={"passcode": temp})
        assert r_new.status_code == 200
        new_token = r_new.json()["token"]

        # Restore to original
        r_restore = requests.post(
            f"{API}/admin/change-passcode",
            json={"current_passcode": temp, "new_passcode": PASSCODE},
            headers={"Authorization": f"Bearer {new_token}"},
        )
        assert r_restore.status_code == 200

        # Verify restore
        r_final = requests.post(f"{API}/auth/login", json={"passcode": PASSCODE})
        assert r_final.status_code == 200
