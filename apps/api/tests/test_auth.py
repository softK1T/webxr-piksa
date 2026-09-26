from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api import get_session
from app.database import Base
from app.main import app
from app.security import create_token, read_token


@pytest.fixture()
def client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)

    def session_override() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = session_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_session, None)


CREDS = {"login": "nazar", "password": "secret-pass-1"}


def test_register_sets_session_and_me_works(client: TestClient) -> None:
    response = client.post("/auth/register", json=CREDS)
    assert response.status_code == 201
    assert "piksa_session" in response.cookies
    assert client.get("/auth/me").json()["login"] == "nazar"


def test_login_must_be_unique_case_insensitive(client: TestClient) -> None:
    client.post("/auth/register", json=CREDS)
    response = client.post("/auth/register", json={**CREDS, "login": "NAZAR"})
    assert response.status_code == 409


def test_wrong_password_and_unknown_login(client: TestClient) -> None:
    client.post("/auth/register", json=CREDS)
    client.post("/auth/logout")
    bad = client.post("/auth/login", json={**CREDS, "password": "wrong-pass-1"})
    assert bad.status_code == 401
    unknown = client.post("/auth/login", json={**CREDS, "login": "ghost"})
    assert unknown.status_code == 401
    assert client.post("/auth/login", json=CREDS).status_code == 200


def test_protected_routes_require_session(client: TestClient) -> None:
    assert client.get("/scenes").status_code == 401
    client.post("/auth/register", json=CREDS)
    assert client.get("/scenes").status_code == 200
    client.post("/auth/logout")
    client.cookies.clear()
    assert client.get("/scenes").status_code == 401
    assert client.get("/auth/me").status_code == 401


def test_invalid_payload_rejected(client: TestClient) -> None:
    assert (
        client.post("/auth/register", json={"login": "a", "password": "x"}).status_code
        == 422
    )


def test_token_tamper_and_expiry() -> None:
    token = create_token(7, now=1000.0)
    assert read_token(token, now=1001.0) == 7
    assert read_token(token + "0", now=1001.0) is None
    assert read_token(token, now=10**10) is None
    assert read_token("garbage") is None
