from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api import router
from app.auth import current_user
from app.auth import router as auth_router
from app.database import make_engine

app = FastAPI(title="Piksa VR API")
app.include_router(auth_router)
app.include_router(router, dependencies=[Depends(current_user)])
# Latency: compress JSON/scene configs, let the browser cache model files between sessions.
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def cache_model_files(request: Request, call_next):  # type: ignore[no-untyped-def]
    response = await call_next(request)
    if request.url.path.endswith("/model.glb") and response.status_code == 200:
        response.headers.setdefault("Cache-Control", "private, max-age=86400")
    return response


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def database_health() -> dict[str, str]:
    try:
        with make_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return {"status": "ok"}
