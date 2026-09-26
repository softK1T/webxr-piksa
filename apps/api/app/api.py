import os
import re
from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import make_engine
from app.glb import GLBError, inspect_glb
from app.models import ModelAsset, SceneConfig
from app.schemas import ModelInfo, ModelOut, SceneIn, SceneOut, SceneSummary

router = APIRouter()
MODEL_NAME = re.compile(r"^[a-z0-9_]{1,64}$")


def get_session() -> Iterator[Session]:
    with Session(make_engine()) as session:
        yield session


def models_dir() -> Path:
    path = Path(os.environ.get("MODELS_DIR", "uploads"))
    path.mkdir(parents=True, exist_ok=True)
    return path


SessionDep = Annotated[Session, Depends(get_session)]
StorageDep = Annotated[Path, Depends(models_dir)]


def _out(row: SceneConfig) -> SceneOut:
    return SceneOut(id=row.id, **SceneIn.model_validate(row.config).model_dump())


def _get_scene(session: Session, scene_id: int) -> SceneConfig:
    row = session.get(SceneConfig, scene_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return row


def _commit(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Name already exists") from exc


@router.get("/scenes")
def list_scenes(session: SessionDep) -> list[SceneSummary]:
    rows = session.scalars(select(SceneConfig).order_by(SceneConfig.name)).all()
    return [
        SceneSummary(id=r.id, name=r.name, objects=len(r.config.get("objects", [])))
        for r in rows
    ]


@router.post("/scenes", status_code=201)
def create_scene(payload: SceneIn, session: SessionDep) -> SceneOut:
    row = SceneConfig(name=payload.name, config=payload.model_dump(mode="json"))
    session.add(row)
    _commit(session)
    session.refresh(row)
    return _out(row)


@router.post("/scenes/import", status_code=201)
def import_scene(payload: SceneIn, session: SessionDep) -> SceneOut:
    row = session.scalar(select(SceneConfig).where(SceneConfig.name == payload.name))
    if row is None:
        row = SceneConfig(name=payload.name, config=payload.model_dump(mode="json"))
        session.add(row)
    else:
        row.config = payload.model_dump(mode="json")
    _commit(session)
    session.refresh(row)
    return _out(row)


@router.get("/scenes/{scene_id}")
def get_scene(scene_id: int, session: SessionDep) -> SceneOut:
    return _out(_get_scene(session, scene_id))


@router.put("/scenes/{scene_id}")
def update_scene(scene_id: int, payload: SceneIn, session: SessionDep) -> SceneOut:
    row = _get_scene(session, scene_id)
    row.name = payload.name
    row.config = payload.model_dump(mode="json")
    _commit(session)
    session.refresh(row)
    return _out(row)


@router.delete("/scenes/{scene_id}", status_code=204)
def delete_scene(scene_id: int, session: SessionDep) -> Response:
    session.delete(_get_scene(session, scene_id))
    session.commit()
    return Response(status_code=204)


@router.get("/scenes/{scene_id}/export")
def export_scene(scene_id: int, session: SessionDep) -> Response:
    row = _get_scene(session, scene_id)
    body = SceneIn.model_validate(row.config).model_dump_json(indent=2)
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", row.name)
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{safe}.json"'},
    )


def _check(data: bytes) -> dict[str, int]:
    try:
        return inspect_glb(data)
    except GLBError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/models/validate")
async def validate_model(request: Request) -> ModelInfo:
    return ModelInfo(**_check(await request.body()))


@router.post("/models", status_code=201)
async def upload_model(
    request: Request,
    name: Annotated[str, Query()],
    session: SessionDep,
    storage: StorageDep,
) -> ModelOut:
    if not MODEL_NAME.match(name):
        raise HTTPException(status_code=422, detail="Name must match [a-z0-9_]{1,64}")
    data = await request.body()
    info = _check(data)
    if session.scalar(select(ModelAsset).where(ModelAsset.name == name)):
        raise HTTPException(status_code=409, detail="Name already exists")
    (storage / f"{name}.glb").write_bytes(data)
    row = ModelAsset(name=name, size=len(data), **info)
    session.add(row)
    _commit(session)
    session.refresh(row)
    return ModelOut.model_validate(row)


@router.get("/models")
def list_models(session: SessionDep) -> list[ModelOut]:
    rows = session.scalars(select(ModelAsset).order_by(ModelAsset.name)).all()
    return [ModelOut.model_validate(r) for r in rows]


@router.get("/models/{name}/model.glb")
def download_model(name: str, storage: StorageDep) -> FileResponse:
    path = storage / f"{name}.glb"
    if not MODEL_NAME.match(name) or not path.is_file():
        raise HTTPException(status_code=404, detail="Model not found")
    return FileResponse(path, media_type="model/gltf-binary", filename=f"{name}.glb")
