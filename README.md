# BooratramG4

BooratramG4 is an AI Business Brain platform by BG Studio AI. The repository is structured as a two-app workspace:

- `backend/`: NestJS 10 + Prisma + PostgreSQL/pgvector + Redis foundation
- `frontend/`: React 18 + Vite + Tailwind shell for tenant and super-admin apps

## Current scope

This bootstrap covers the platform foundation for the pilot tenant:

- multi-tenant data model with isolation via `tenantId`
- JWT auth with `SUPER_ADMIN`, `TENANT_ADMIN`, `MEMBER`
- DeepSeek-oriented AI core services and prompt builder
- cases, knowledge, onboarding, projects, tasks, calendar, deadlines module scaffolding
- admin panel and client UI shells
- Docker Compose for local development and production baseline

## Quick start

1. Copy `.env.example` to `.env` (the dev stack uses PostgreSQL on `5433`, Redis on `6380`, and backend API on `3003` to avoid conflicts with other local projects)
2. Install dependencies:

```bash
npm install
```

3. Start infrastructure:

```bash
docker compose up -d postgres redis
```

4. Generate Prisma client and run migrations:

```bash
npm --workspace backend run prisma:generate
npm --workspace backend run prisma:migrate
npm --workspace backend run prisma:seed
```

5. Run apps:

```bash
npm run dev:backend
npm run dev:frontend
```

## Backend API

The backend is exposed on `http://localhost:3003/api` and includes these initial route groups:

- `/api/auth`
- `/api/admin`
- `/api/tenants`
- `/api/cases`
- `/api/knowledge`
- `/api/projects`
- `/api/tasks`
- `/api/calendar`
- `/api/deadlines`
- `/api/onboarding`
- `/api/brain/status`

## Notes

- Semantic search is always filtered by `tenantId`.
- DeepSeek chat is wired as a live service. In DeepSeek-only mode, embeddings run through a deterministic local fallback until an external embedding provider is configured.
- BullMQ alert scheduling is scaffolded through service-level planning and Redis config.
- The frontend includes an authenticated Brain screen that shows AI status, model selection, and runtime metadata.
