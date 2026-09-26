import json
import struct
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models
from app.api import get_session, models_dir
from app.database import Base
from app.glb import GLBError, inspect_glb
from app.main import app


def make_glb(doc: dict[str, Any]) -> bytes:
    body = json.dumps(doc).encode()
    body += b" " * (-len(body) % 4)
    header = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(body))
    return header + struct.pack("<II", len(body), 0x4E4F534A) + body


TRIANGLE: dict[str, Any] = {
    "asset": {"version": "2.0"},
    "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}],
    "accessors": [{"count": 3, "componentType": 5126, "type": "VEC3"}],
}

SCENE: dict[str, Any] = {
    "name": "lab",
    "objects": [
        {"id": "flask", "model": "lab_flask", "position": [1, 0.9, 0]},
        {"id": "tube", "model": "test_tube", "scale": [2, 2, 2]},
    ],
}


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)

    def session() -> Iterator[Session]:
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_session] = session
    app.dependency_overrides[models_dir] = lambda: tmp_path
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_inspect_glb_counts_triangles() -> None:
    assert inspect_glb(make_glb(TRIANGLE)) == {
        "meshes": 1,
        "triangles": 1,
        "materials": 0,
    }


@pytest.mark.parametrize(
    "data",
    [
        b"not a glb at all, definitely",
        make_glb({"asset": {"version": "2.0"}}),
        make_glb({**TRIANGLE, "buffers": [{"uri": "external.bin"}]}),
        make_glb(TRIANGLE)[:-4],
    ],
)
def test_inspect_glb_rejects_invalid(data: bytes) -> None:
    with pytest.raises(GLBError):
        inspect_glb(data)


def test_scene_crud_and_export(client: TestClient) -> None:
    created = client.post("/scenes", json=SCENE)
    assert created.status_code == 201
    scene_id = created.json()["id"]
    assert created.json()["objects"][1]["scale"] == [2, 2, 2]
    assert client.post("/scenes", json=SCENE).status_code == 409
    assert client.get("/scenes").json() == [
        {"id": scene_id, "name": "lab", "objects": 2}
    ]
    updated = client.put(f"/scenes/{scene_id}", json={**SCENE, "objects": []})
    assert updated.json()["objects"] == []
    exported = client.get(f"/scenes/{scene_id}/export")
    assert "attachment" in exported.headers["content-disposition"]
    assert exported.json()["name"] == "lab"
    assert client.delete(f"/scenes/{scene_id}").status_code == 204
    assert client.get(f"/scenes/{scene_id}").status_code == 404


def test_import_upserts_by_name(client: TestClient) -> None:
    first = client.post("/scenes/import", json=SCENE).json()
    second = client.post("/scenes/import", json={**SCENE, "objects": []}).json()
    assert first["id"] == second["id"]
    assert second["objects"] == []


@pytest.mark.parametrize(
    "obj",
    [
        {"id": "a", "model": "m", "scale": [0, 1, 1]},
        {"id": "a", "model": "m", "position": [100, 0, 0]},
        {"id": "bad id", "model": "m"},
    ],
)
def test_invalid_scene_objects(client: TestClient, obj: dict[str, Any]) -> None:
    assert (
        client.post("/scenes", json={"name": "x", "objects": [obj]}).status_code == 422
    )


def test_duplicate_object_ids(client: TestClient) -> None:
    objs = [{"id": "a", "model": "m"}, {"id": "a", "model": "n"}]
    assert (
        client.post("/scenes", json={"name": "x", "objects": objs}).status_code == 422
    )


def test_model_upload_validate_download(client: TestClient) -> None:
    glb = make_glb(TRIANGLE)
    assert client.post("/models/validate", content=glb).json()["triangles"] == 1
    uploaded = client.post("/models?name=my_model", content=glb)
    assert uploaded.status_code == 201
    assert uploaded.json()["name"] == "my_model"
    assert client.post("/models?name=my_model", content=glb).status_code == 409
    assert client.get("/models").json()[0]["size"] == len(glb)
    downloaded = client.get("/models/my_model/model.glb")
    assert downloaded.content == glb
    assert client.get("/models/missing/model.glb").status_code == 404


def test_model_upload_rejects_bad_input(client: TestClient) -> None:
    assert (
        client.post("/models?name=Bad-Name", content=make_glb(TRIANGLE)).status_code
        == 422
    )
    bad = client.post("/models?name=ok", content=b"garbage garbage garbage")
    assert bad.status_code == 422
    assert "GLB" in bad.json()["detail"]


@pytest.fixture(autouse=True)
def _auth_override() -> Iterator[None]:
    from app.auth import current_user
    from app.main import app as main_app

    main_app.dependency_overrides[current_user] = lambda: None
    yield
    main_app.dependency_overrides.pop(current_user, None)
