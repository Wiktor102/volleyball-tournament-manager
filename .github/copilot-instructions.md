# Copilot instructions for this repository

## Project status
- This repo currently contains **`plan.md` only** (an implementation plan/design doc). There is **no application code yet**, so build/test/lint commands are not available.
- Use `plan.md` as the source of truth for intended stack, architecture, and conventions until code lands.

## Build, test, lint
- **Not configured yet** (no `package.json`, `Makefile`, `pyproject.toml`, etc.).
- When code is added, prefer documenting commands in `package.json` scripts (expected tooling per `plan.md`: Vite, TypeScript, React, Express, Drizzle).
- If you introduce a test runner, also document how to run a *single test* (e.g., a single Vitest file) in this file.

## High-level architecture (intended; from `plan.md`)

### Big picture
- **LAN-hosted web app**: one host machine runs a Node.js server and SQLite DB; multiple clients connect over LAN.
- **Real-time first**: Socket.io is the primary update mechanism (avoid polling).
- **Frontend**: React + TypeScript (planned Vite build) with multiple “views” (admin, fan display, player display, OBS overlay).

### Backend responsibilities (planned structure)
- Express HTTP server + Socket.io server.
- SQLite as the only datastore (portable, no internet dependency).
- Drizzle ORM for schema/migrations and type-safe DB access.
- Zod for runtime validation at boundaries (incoming socket payloads / API payloads).
- Domain services (planned): tournament, match, team, bracket, scoring; keep Socket.io handlers thin and delegate to services.

### Real-time model (planned)
- Server broadcasts changes via Socket.io events (examples in `plan.md`):
  - `tournament:*`, `bracket:*`, `match:*`, `team:*`
- Client→server actions are primarily `admin:*` events (e.g., score updates, match start/end, bracket assignment).
- Use **room-based broadcasting** (e.g., `tournament:${id}`, `match:${id}`, `admin`) to limit fanout.
- Scoring should be **server-authoritative** (increments processed server-side).

### Frontend responsibilities (planned)
- Socket.io client integrated via a React context + hooks.
- State management with Zustand stores synced from socket events.
- React Router for view routing.
- OBS overlay is a dedicated route with transparent background and animation-heavy UI (planned Framer Motion).

## Key conventions (intended; from `plan.md`)

### Tournament constraints
- Single-elimination bracket with optional byes and a **3rd place match**.
- **Single court**: only one match at a time (simplifies “current match” assumptions).
- **Players are names only** (no accounts/auth mentioned in plan).
- **Polish-only UI**.

### Scoring model
- Scoring is **pluggable per round** (sets+points, points-only, timed). Keep scoring logic centralized (planned `scoring.service.ts`) and store configs as structured JSON.

### Concurrency expectations
- Plan calls out multiple admins editing simultaneously:
  - Last-write-wins for simple metadata.
  - Server-authoritative for score operations.
  - If optimistic UI is used, ensure a clear rollback path on conflict.

## Where to look first
- `plan.md`:
  - Intended folder structure (server vs `src/` frontend)
  - Socket.io event naming
  - DB schema outline
  - Key UX routes (admin/display/overlay)
