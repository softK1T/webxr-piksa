# Piksa VR

Interactive WebXR visualization and simulation system: a low-poly virtual laboratory built with React/TypeScript/Vite + Babylon.js on the client and FastAPI/SQLAlchemy/Alembic/PostgreSQL on the server. Target device: HTC VIVE Focus 3.

## Run with Docker

```bash
cp .env.example .env
make blender-models   # generate 3D models (see below)
make up
make migrate
curl http://localhost:8000/health
curl http://localhost:8000/health/db
```

Client: http://localhost:5173. API docs: http://localhost:8000/docs. Stop: `make down`. Inside Docker Compose `DATABASE_URL` must use the `db` host. If you change the database password in `.env`, remove the old volume (`docker compose down -v` deletes all data).

## Local development

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
# Set DATABASE_URL to a local PostgreSQL, or sqlite:///./local.db for quick API checks
uvicorn app.main:app --reload
```

```bash
cd apps/web
npm ci
npm run dev
```

The frontend proxies `/api/*` to the local API (to the `api` service in Compose).

## Checks

With `apps/api/.venv` created and npm dependencies installed:

```bash
make format
make lint
make type-check
make test
make build
make validate-models
```

Alembic is configured; the first migration will be created together with the first domain model (`cd apps/api && alembic revision --autogenerate -m "initial schema"`). In Docker: `make migrate`.

## Blender pipeline

All 15 low-poly models are generated procedurally by `bpy` scripts in `tools/blender/generators/` (shared helpers in `tools/blender/common.py`).

```bash
make blender-models                           # .blend -> assets/blender/, .glb -> apps/web/public/models/
make blender-models BLENDER=/path/to/Blender  # custom Blender path
make validate-models                          # writes reports/model-validation.json
```

The validator checks file presence and size, a root node named after the model, mesh primitives, the upper triangle limit, at most 3 materials, no external resources, no cameras or lights, and scale (0.02-2.5 m). `fire_extinguisher` and `measurement_device` contain `<name>_LOD0/1/2` nodes; the LOD1 ratio must be 40-60% and LOD2 15-30% of LOD0. Lower triangle bounds are soft targets reported as warnings, because the plan forbids adding geometry for unnoticeable details.

Generated `.blend`/`.glb` files are not stored in git; run `make blender-models` after cloning.

## Desktop scene

- `src/scene/buildRoom.ts`: 10x8x3 m room with floor, walls, ceiling, door, two tables, shelf, control console, ceiling lamps and a preparation zone.
- `src/scene/labLayout.ts`: placement of the 15 GLB models.
- `src/scene/loadLabModels.ts`: sequential GLB loading (LOD1/LOD2 hidden until the optimization stage); failures are shown in the HUD.
- `src/scene/createLabScene.ts`: lighting (3 lights) and a first-person camera with collisions.
- `src/components/LabCanvas.tsx`: Babylon engine lifecycle, resize handling and resource disposal.

Controls: WASD/arrow keys to move, hold the left mouse button to look around, click to select an object.

## WebXR

- `src/xr/xrSupport.ts`: checks secure context, `navigator.xr` and `immersive-vr` support.
- `src/xr/setupXR.ts`: XR session (`local-floor`), two controllers with pointer rays, trigger/squeeze selection, teleportation restricted to the floor with snap turning, free locomotion (left stick) with smooth turning (right stick), and mode switching.
- `src/xr/selection.ts`: outline highlight of the selected object (mouse click on desktop, trigger/squeeze in VR).

### Testing without a headset

Install the [Immersive Web Emulator](https://chromewebstore.google.com/detail/immersive-web-emulator/cgffilbpcibhmcfbgggfhfolhkfbhmik) extension in Chrome/Edge, open http://localhost:5173 and enable emulation for the site. The HUD shows "VR available" and the Enter VR button becomes active.

### Testing on HTC VIVE Focus 3

WebXR requires a secure context (HTTPS or `localhost`). The simplest way is USB:

```bash
adb devices
adb reverse tcp:5173 tcp:5173
adb reverse tcp:8000 tcp:8000
```

Then open http://localhost:5173 in VIVE Browser and press Enter VR.

VR controls: teleport by pushing the stick forward and releasing, snap turn with the stick left/right; trigger/squeeze selects the object under the ray.
