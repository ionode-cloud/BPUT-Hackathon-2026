"""Shared test setup: isolated database + model cache, app bootstrapped once per session.

Uses SQLite by default; set TEST_DATABASE_URL to run the suite against PostgreSQL."""
import os
import sys
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="campuslink-test-"))
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", f"sqlite:///{_tmp / 'test.db'}")
os.environ.setdefault("CAMPUSLINK_MODEL_DIR", str(_tmp / "models"))
os.environ["MODEL_DIR"] = os.environ["CAMPUSLINK_MODEL_DIR"]
os.environ["LLM_AUTOLOAD"] = "false"
os.environ["AUTOMATION_INTERVAL_MINUTES"] = "0"
os.environ["LOGIN_ATTEMPTS_PER_MINUTE"] = "1000"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if os.environ.get("TEST_DATABASE_URL", "").startswith("postgres"):  # start from an empty schema
    import sqlalchemy as sa
    _url = os.environ["TEST_DATABASE_URL"].replace("postgresql://", "postgresql+psycopg://", 1)
    with sa.create_engine(_url).begin() as _c:
        _c.execute(sa.text("DROP SCHEMA public CASCADE; CREATE SCHEMA public"))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402

ACCOUNTS = {"admin": ("admin@campuslink.edu", "Admin@123"), "officer": ("officer@campuslink.edu", "Officer@123"),
            "student": ("student@campuslink.edu", "Student@123"),
            "recruiter": ("recruiter@nimbus.example.com", "Recruiter@123"), "mentor": ("mentor@campuslink.edu", "Mentor@123")}


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def db(client):
    s = SessionLocal()
    yield s
    s.close()


@pytest.fixture(scope="session")
def tokens(client):
    out = {}
    for role, (email, pw) in ACCOUNTS.items():
        r = client.post("/api/auth/login", json={"email": email, "password": pw})
        assert r.status_code == 200, r.text
        out[role] = {"Authorization": f"Bearer {r.json()['access_token']}"}
    return out
