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

## Interaction and simulation

- `src/sim/scenario.ts`: pure state machine for the procedure, kept separate from rendering. It validates the order of steps and returns hints on mistakes.
- `src/sim/zones.ts`: drop zones (`prep_zone`, `workbench_zone`, `rack_zone`) and the items each accepts.
- `src/sim/grab.ts`: grab/carry/release; released items snap into a matching zone or return to their previous place.
- `src/sim/interaction.ts`: button press, lever toggle, information panel and container selection.
- `src/sim/infoPanel.ts`: in-world information panel showing the procedure, progress and hints (readable in VR).

Procedure: open the information panel, put the goggles in the preparation zone (yellow), find the flask (shelf), carry it to the workbench zone (blue), put the test tube into the rack, select the blue container, switch the lever on, press the start button.

Desktop: click to interact; click a grabbable item (goggles, flask, test tube) to pick it up, walk to the zone and click again to drop it. VR: trigger interacts, hold squeeze to grab and release squeeze to drop.

## User interface

- Main menu: start on desktop or in VR, instructions, settings. VR support status is shown in the menu.
- Settings (`src/ui/settings.ts`, stored in `localStorage`): movement speed, VR locomotion (teleport/free), VR turning (snap/smooth), graphics quality (low/medium/high, mapped to render resolution).
- In-scene hints: a yellow marker (`src/sim/hintMarker.ts`) floats above the next target (item or drop zone); the information panel lists steps and hints and is readable in VR.
- HUD progress bar, current step and message; result screen with time and mistake count after a successful run.

## Content management

Open **Scene editor** from the main menu (side panel; the scene stays visible).

- Select an object and edit position, rotation (degrees) and scale; changes apply live.
- Save/load scene configurations to the database, export the current scene to JSON and import JSON (validated on the client and the server).
- Add built-in models, export a built-in model as GLB.
- Upload a `.glb`: it is validated first (glTF 2.0 binary, at least one mesh, no external resources, at most 150k triangles, at most 20 MB), then stored and can be added to the scene or downloaded again.

API (`apps/api/app/api.py`): `GET/POST /scenes`, `POST /scenes/import`, `GET/PUT/DELETE /scenes/{id}`, `GET /scenes/{id}/export`, `POST /models/validate`, `POST /models?name=`, `GET /models`, `GET /models/{name}/model.glb`. Uploaded files are stored in `MODELS_DIR` (default `uploads/`). Apply the migration with `make migrate`.

## Authentication

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- Passwords are hashed with `scrypt`; the session is an httpOnly cookie `piksa_session` (HMAC-SHA256, 7 days).
- All `/scenes` and `/models` routes require a session.
- Set `SECRET_KEY` (e.g. `openssl rand -hex 32`) in `.env`; use `COOKIE_SECURE=1` behind HTTPS.
- External login research: `docs/oauth-research.md`.

## Optimization and quality profiles

| Profile | LOD switch (m) | Dynamic lights | Shadows          | Resolution         |
| ------- | -------------- | -------------- | ---------------- | ------------------ |
| low     | 3 / 6          | 1              | off              | 1/1.5              |
| medium  | 5 / 10         | 2              | objects >= 0.6 m | 1                  |
| high    | 8 / 16         | 3              | objects >= 0.2 m | device pixel ratio |

- `*_LOD0/1/2` nodes from Blender are switched by camera distance (`src/scene/quality.ts`).
- Static room meshes are frozen after loading; Babylon frustum culling is on by default.
- WebGL is the default renderer. WebGPU is only probed with `?renderer=webgpu` (`docs/webgpu-research.md`).
- Distributed processing research: `docs/distributed-processing.md`.

## End-to-end tests

```bash
cd apps/web && npm install && npx playwright install chromium
cd ../.. && make e2e
```

Playwright starts its own API (port 8001, SQLite `apps/api/e2e.db`) and Vite (port 5174),
so it never hits running Docker containers.
Covered: registration, session after reload, logout, wrong password, duplicate login,
protected API, desktop lab and settings, disabled VR button without a headset,
scene import/export round trip. The simulation procedure is covered by unit tests in `src/sim/`.

## Manual test on HTC VIVE Focus 3

- [ ] Open the HTTPS URL in VIVE Browser, sign in.
- [ ] Enter VR, both controllers and rays visible.
- [ ] Teleport only on the floor; switch to free movement and turn in settings.
- [ ] Grab, carry and release items; drop zones snap.
- [ ] Button, lever and information panel respond.
- [ ] Complete the procedure; wrong order shows a hint.
- [ ] Switch low/medium/high, frame rate stays stable.
- [ ] Exit VR returns to the desktop page.

## Model polygon budget

`make validate-models` fails only on hard limits (max LOD0 triangles, LOD ratios, size, materials).
`below soft target` warnings are informational: simple props (containers, sign, panel, controls)
are intentionally lower than the plan's lower bound, because the plan says not to add geometry
for invisible detail. The whole scene is about 6k triangles against a 150k budget.
