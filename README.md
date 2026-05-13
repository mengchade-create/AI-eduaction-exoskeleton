# ExoKids

ExoKids is a K-12 exoskeleton teaching platform for primary-school learners. The project follows [SPEC.md](./SPEC.md) as the single source of truth.

## Phase 0 Skeleton

This repository is organized as a monorepo so the web app, API, Raspberry Pi agent, shared packages, deployment scripts, and documentation can evolve together.

Top-level areas:

- `apps/web`: React 18 + Vite + TypeScript student, teacher, and admin app.
- `apps/api`: FastAPI backend.
- `apps/landing`: optional public site area.
- `packages/exo-sdk-python`: Python `exo` SDK loaded by Pyodide in later phases.
- `packages/blockly-exo`: Blockly blocks and Python generator in later phases.
- `packages/shared`: shared TypeScript contracts for frontend-facing types. Its first exports are `UserRole`, matching `users.role` in SPEC section 4, and `JwtPayload` for auth contracts.
- `pi-agent`: Raspberry Pi agent for Phase 4 real-device work.
- `scripts`: local development, build, seed, and deployment helpers.
- `docs`: implementation notes and user-facing guides.
- `reference`: user-provided hardware references. Phase 4 must read these before touching real-device code.

## Local Commands

```bash
make lint
make test
make build
```

The commands run the Phase 0 checks through Docker Compose containers. `make test`
runs the API pytest suite plus the web lint/build checks.

## Development Environment

```bash
cp .env.example .env
docker compose config --services
docker compose up -d db minio
docker compose up -d api
docker compose up -d web
```

The web app runs at http://localhost:5173 and proxies API calls to
http://localhost:8000. Default seed accounts are created during API startup; for
example, `xingxing` uses the password from `EXOKIDS_SEED_PASSWORD`.
