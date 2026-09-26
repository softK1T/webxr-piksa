PYTHON ?= $(abspath apps/api/.venv/bin/python)

.PHONY: up down format lint type-check test build migrate blender-models validate-models
up:
	docker compose up --build -d

down:
	docker compose down

format:
	cd apps/api && $(PYTHON) -m ruff format .
	cd apps/web && npm run format

lint:
	cd apps/api && $(PYTHON) -m ruff check . && $(PYTHON) -m ruff format --check .
	cd apps/web && npm run lint && npm run format:check

type-check:
	cd apps/api && $(PYTHON) -m mypy app
	cd apps/web && npm run type-check

test:
	cd apps/api && $(PYTHON) -m pytest
	cd apps/web && npm test -- --run

build:
	cd apps/web && npm run build

migrate:
	docker compose exec api alembic upgrade head

BLENDER ?= /Volumes/SamsungSSD/SteamLibrary/steamapps/common/Blender/Blender.app/Contents/MacOS/Blender

blender-models:
	BLENDER_USER_RESOURCES=$(CURDIR)/.blender-user $(BLENDER) --background --factory-startup --python-exit-code 1 --python tools/blender/generate_all.py

validate-models:
	python3 tools/blender/validate_models.py
