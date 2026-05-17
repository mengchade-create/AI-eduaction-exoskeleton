# Phase 1 Context

Generated from the repository state on branch `main`.

## 1. Current Git State

### Branch

```text
## main...origin/main
```

### Last 5 Commits

```text
8ac1e2a Merge pull request #4 from mengchade-create/feat/p0-compose-smoke
f82bfb1 feat(phase0): web login/dashboard + compose end-to-end smoke (PR4+PR5)
1d95e22 Merge pull request #2 from mengchade-create/feat/p0-api-auth-skeleton
fe7bf92 docs(api): add README with setup and auth usage
8970f50 test(api): add auth and health tests
```

### Latest Tag

```text
v0.1.0-phase0
```

## 2. Repository File Tree Snapshot

First 100 tracked files from `git ls-files`:

```text
.env.example
.gitattributes
.gitignore
Makefile
NEXT.md
README.md
SPEC.md
apps/api/README.md
apps/api/alembic.ini
apps/api/alembic/.gitkeep
apps/api/alembic/env.py
apps/api/alembic/script.py.mako
apps/api/alembic/versions/0001_initial_schema.py
apps/api/app/__init__.py
apps/api/app/_version.py
apps/api/app/config.py
apps/api/app/db/.gitkeep
apps/api/app/db/__init__.py
apps/api/app/db/session.py
apps/api/app/db/types.py
apps/api/app/deps.py
apps/api/app/main.py
apps/api/app/models/.gitkeep
apps/api/app/models/__init__.py
apps/api/app/models/tables.py
apps/api/app/routers/.gitkeep
apps/api/app/routers/__init__.py
apps/api/app/routers/auth.py
apps/api/app/routers/health.py
apps/api/app/schemas/.gitkeep
apps/api/app/schemas/__init__.py
apps/api/app/schemas/auth.py
apps/api/app/security.py
apps/api/app/seeds/__init__.py
apps/api/app/seeds/default_seed.py
apps/api/app/services/classifier/.gitkeep
apps/api/app/services/deploy/.gitkeep
apps/api/app/services/device/.gitkeep
apps/api/app/services/experiment/.gitkeep
apps/api/app/services/llm/.gitkeep
apps/api/app/services/simulation/.gitkeep
apps/api/app/services/telemetry/.gitkeep
apps/api/app/ws/.gitkeep
apps/api/pyproject.toml
apps/api/tests/.gitkeep
apps/api/tests/conftest.py
apps/api/tests/test_auth.py
apps/api/tests/test_health.py
apps/landing/.gitkeep
apps/web/README.md
apps/web/eslint.config.js
apps/web/index.html
apps/web/package-lock.json
apps/web/package.json
apps/web/postcss.config.js
apps/web/public/.gitkeep
apps/web/src/App.tsx
apps/web/src/api/auth.ts
apps/web/src/api/client.ts
apps/web/src/api/types.ts
apps/web/src/components/.gitkeep
apps/web/src/components/AuthContext.tsx
apps/web/src/components/Exobot.tsx
apps/web/src/components/authState.ts
apps/web/src/features/blockly/.gitkeep
apps/web/src/features/classifier/.gitkeep
apps/web/src/features/classroom/.gitkeep
apps/web/src/features/coding/.gitkeep
apps/web/src/features/dashboard/.gitkeep
apps/web/src/features/deploy/.gitkeep
apps/web/src/features/llm/.gitkeep
apps/web/src/features/simulator/.gitkeep
apps/web/src/index.css
apps/web/src/main.tsx
apps/web/src/pages/.gitkeep
apps/web/src/pages/DashboardPage.tsx
apps/web/src/pages/LoginPage.tsx
apps/web/src/runtime/.gitkeep
apps/web/src/sdk/.gitkeep
apps/web/src/simulation/.gitkeep
apps/web/src/store/.gitkeep
apps/web/src/theme/.gitkeep
apps/web/tailwind.config.ts
apps/web/tsconfig.json
apps/web/tsconfig.node.json
apps/web/vite.config.ts
docker-compose.dev.yml
docker-compose.yml
docs/.gitkeep
docs/SOP.md
docs/phase-0-plan.md
docs/pr-template.md
ops/daily.py
ops/kaigong.py
ops/shougong.py
packages/blockly-exo/src/.gitkeep
packages/exo-sdk-python/exo/.gitkeep
packages/shared/package.json
packages/shared/src/index.ts
pi-agent/agent/.gitkeep
```

## 3. Phase 0 Deliverables

Extracted from PR #4 body.

### PR #4 What

- Adds the `apps/web` Vite + React + TypeScript + Tailwind frontend scaffold.
- Adds the kid-friendly login page, local SVG Exobot, in-memory auth context, API client, and empty role dashboard.
- Converts Docker Compose from placeholders to a real end-to-end smoke stack for db/minio/api/web.
- Wires `make test` to run API pytest plus web lint/build through Docker Compose.

### PR #4 Scope

- [x] `apps/web` frontend scaffold with Vite, React, TypeScript, Tailwind CSS
- [x] Login page with username/password and visual-only student avatar choice
- [x] Empty role dashboard for `admin`, `teacher`, and `student`
- [x] Local SVG Exobot, no external image fetches
- [x] API wrappers for `/api/auth/login` and `/api/auth/me`
- [x] Compose db/minio/api/web stack with real API startup, migration, seed, and web dev server
- [x] TimescaleDB-backed database for the migration prerequisite
- [x] Makefile checks wired to Docker Compose

### Phase 0 Exit Checklist

- [x] `docker compose config --services` resolves and lists `minio`, `db`, `api`, `web`
- [x] `.env` can be prepared from `.env.example` with placeholder values
- [x] `db` starts and becomes healthy
- [x] `minio` starts and becomes healthy
- [x] `api` starts, runs migration, seeds default users, and becomes healthy
- [x] `web` starts on `http://localhost:5173`
- [x] `http://localhost:5173` renders the login page
- [x] Seed account login succeeds and reaches the empty student Dashboard
- [x] `make test` passes
- [x] Phase 0 has a reproducible Compose smoke path for entering Phase 1

## 4. Current Database Tables

Read from `apps/api/alembic/versions/0001_initial_schema.py` and cross-checked with `apps/api/app/models/tables.py`.

- `users`
- `classes`
- `class_members`
- `assignments`
- `submissions`
- `experiments`
- `telemetry`
- `devices`
- `deployments`
- `classifier_datasets`
- `classifier_models`
- `llm_sessions`
- `audit_logs`

Notes:

- `telemetry` is converted to a TimescaleDB hypertable by `create_hypertable('telemetry', 'ts')`.
- Migration requires `timescaledb` extension to exist before `create_hypertable` runs.

## 5. Current API Routes

Read from `apps/api/app/main.py` and included routers.

### Router Registration

```python
app.include_router(auth.router)
app.include_router(health.router)
```

### Routes

From `apps/api/app/routers/auth.py`:

- `POST /auth/login`
  - Request body schema: `LoginRequest`
  - Response schema: `LoginResponse`
  - Looks up user by `username`, verifies `password`, returns `access_token` and `user`.
- `GET /auth/me`
  - Requires current user dependency from bearer token.
  - Response schema: `UserOut`.

From `apps/api/app/routers/health.py`:

- `GET /health`
  - Returns `{"status": "ok", "version": get_app_version()}`.
- `GET /health/db`
  - Executes `SELECT 1`; returns `{"db": "ok"}` or `500 db_unavailable`.

## 6. Current Frontend Pages And Routes

Read from `apps/web/src/App.tsx`.

- `/`
  - Component: `RootRedirect`
  - Behavior: redirects to `/login` when no user is in memory; otherwise redirects to `/dashboard/{user.role}`.
- `/login`
  - Component: `LoginPage`
  - File: `apps/web/src/pages/LoginPage.tsx`
  - Behavior: username/password login, visual-only student avatar selection, calls `/api/auth/login`.
- `/dashboard/:role`
  - Component: `ProtectedDashboard` wrapping `DashboardPage`
  - File: `apps/web/src/pages/DashboardPage.tsx`
  - Behavior: requires in-memory user; otherwise redirects to `/login`. Displays Exobot, current user display name, and role placeholder.
- `*`
  - Behavior: redirects to `/`.

Auth state:

- `apps/web/src/components/AuthContext.tsx`
- `apps/web/src/components/authState.ts`
- Token/user are stored in React state only, not `localStorage`.

API client:

- `apps/web/src/api/auth.ts`
- `apps/web/src/api/client.ts`
- `apps/web/src/api/types.ts`

## 7. `.env.example`

```env
# Core
ENV=dev
SECRET_KEY=change-me-please-secret-key
JWT_SECRET=change-me-please-jwt-secret
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]

# Database
POSTGRES_USER=exokids
POSTGRES_PASSWORD=change-me-please-postgres-password
POSTGRES_DB=exokids

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=change-me-please-minio-password
# S3 client credentials used by api service.
# Dev: same as root for convenience. Prod: create a dedicated service account.
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=change-me-please-minio-password
MINIO_ENDPOINT=minio:9000
MINIO_BUCKET=exokids

# LLM (DeepSeek compatible)
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=sk-placeholder
LLM_MODEL=deepseek-chat

# Pi deployment
PI_SSH_KEY_PATH=/app/keys/id_ed25519

# Web
NODE_ENV=development
VITE_API_BASE=http://localhost:8000
VITE_WS_BASE=ws://localhost:8000
EXOKIDS_SEED_PASSWORD=change-me-please-seed-password
```

## 8. `docker-compose.yml` Services And Ports

Read from `docker-compose.yml`.

### `db`

- Image: `timescale/timescaledb:latest-pg16`
- Ports: `5432:5432`
- Healthcheck: `pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}`
- Volume: `pg_data:/var/lib/postgresql/data`

### `minio`

- Image: `minio/minio:latest`
- Command: `server /data --console-address :9001`
- Ports:
  - `9000:9000`
  - `9001:9001`
- Healthcheck: `curl -f http://localhost:9000/minio/health/live || exit 1`
- Volume: `minio_data:/data`

### `api`

- Image: `python:3.11-slim`
- Working dir: `/app`
- Ports: `8000:8000`
- Depends on:
  - `db` healthy
  - `minio` healthy
- Startup command:
  - `pip install -e .`
  - `CREATE EXTENSION IF NOT EXISTS timescaledb`
  - `alembic upgrade head`
  - `python -m app.seeds.default_seed`
  - `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Healthcheck: Python `urllib.request.urlopen('http://localhost:8000/health', timeout=2)`
- Volume: `./apps/api:/app`

### `web`

- Image: `node:22-alpine`
- Working dir: `/app`
- Ports: `5173:5173`
- Depends on:
  - `api` healthy
- Startup command:
  - `npm ci`
  - `npm run dev`
- Volumes:
  - `./apps/web:/app`
  - `web_node_modules:/app/node_modules`

## 9. `make test` Command Chain

Read from `Makefile`.

```makefile
test:
	docker compose run --rm --no-deps api sh -c "pip install -e '.[dev]' && pytest"
	docker compose run --rm --no-deps web sh -c "npm ci && npm run lint && npm run build"
```

Related targets:

```makefile
lint:
	docker compose run --rm --no-deps web sh -c "npm ci && npm run lint"

build:
	docker compose run --rm --no-deps web sh -c "npm ci && npm run build"
```

## Phase 1 closure status (added by chore/p1-spec-reconcile)

The following items previously listed in this document or in earlier
discussion as "awaiting SPEC confirmation" / "calibration pending" are
hereby resolved:

- Walk amplitude — Resolved by decision 0001-walk-amplitude-25deg / SPEC §3.5.3 (locked at 25°).
- Strategy space (5 vs 7) — Resolved by decision 0002-strategy-space-two-axes / SPEC §3.5.4 (two-axis model). `bad_phase` / `reverse` implementation deferred to Phase 2 (B2-impl).
- Display score / medal — Contract resolved by SIM_API §10. Implementation deferred to Phase 2 (C2-impl).
- Hip ROM 80° — Resolved by SPEC §3.5 hip-flexion ROM hard-limit clause (target 75° + margin 5° = 80°).
- `reset()` retains subscriptions — Resolved by SIM_API §8: SPEC does not cover; Phase 1 implementation retained.
- `replay(partial)` semantics — Resolved by SIM_API §8: SPEC does not cover; Phase 1 implementation retained.
- Byte-equality determinism scope — Resolved by SIM_API §8: SPEC does not cover; Phase 1 implementation retained.
- `BASELINE_FLOOR_J_PER_S = 5` — Resolved by SIM_API §8: SPEC does not cover; Phase 1 implementation retained.

Phase 2 follow-up tickets:
- B2-impl: register `bad_phase` and `reverse` in `StrategyFactory`, add unit tests, wire secondary UI entry. Parameters frozen by decision 0002-strategy-space-two-axes (no further parameter discussion required).
- C2-impl: implement `apps/web/src/simulation/scoring/displayScore.ts` per SIM_API §10; calibrate `k_stab` / `k_track` / medal thresholds during dashboard integration.
