# BooratramG4

BooratramG4 is an AI Business Brain platform by BG Studio AI. The repository is a monorepo with two applications:

- `backend/`: NestJS 10 + Prisma + PostgreSQL/pgvector + Redis
- `frontend/`: React 18 + Vite shell for tenant and super-admin interfaces

## Current scope

The current baseline already includes:

- multi-tenant isolation by `tenantId`
- JWT auth with `SUPER_ADMIN`, `TENANT_ADMIN`, `MEMBER`
- DeepSeek-oriented AI core with prompt builder, conversation logging, and memory search
- projects, tasks, calendar, deadlines, cases, knowledge, onboarding, admin, Telegram, notifications
- Bull/BullMQ deadline queue scaffold on Redis
- Docker Compose for local and production bootstrap
- CI workflow for generate/build/test

## Prerequisites

- Node.js 20+
- Docker Desktop / Docker Engine
- npm 10+

## Local bootstrap

1. Copy `.env.example` to `.env`
2. Install dependencies
3. Start PostgreSQL and Redis
4. Apply committed Prisma migrations
5. Seed the pilot tenant

```bash
npm install
npm run infra:up
npm run bootstrap:dev
```

What `bootstrap:dev` does:

```bash
npm run db:generate
npm run db:deploy
npm run seed
```

After that, run the apps:

```bash
npm run dev:backend
npm run dev:frontend
```

## Clean bootstrap verification

For a clean environment the repository is expected to bootstrap from committed migrations only.

Primary commands:

```bash
npm run db:status
npm run db:deploy
npm run seed
```

Notes:

- `PILOT_TENANT_ID` can be left empty. The app falls back to `PILOT_TENANT_SLUG` after reset/seed.
- local host URLs use `localhost:5433`, `localhost:6380`, `localhost:3003`, and `localhost:5173`
- Docker services use `DATABASE_URL_DOCKER` and `REDIS_URL_DOCKER`

## Key scripts

```bash
npm run build
npm run test
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:status
npm run infra:up
npm run infra:down
npm run prod:build
npm run prod:up
npm run prod:down
```

## Backend API

The backend is exposed on `http://localhost:3003/api`.

Main route groups:

- `/api/health`
- `/api/auth`
- `/api/admin`
- `/api/tenants`
- `/api/users`
- `/api/cases`
- `/api/knowledge`
- `/api/projects`
- `/api/tasks`
- `/api/calendar`
- `/api/deadlines`
- `/api/onboarding`
- `/api/brain/status`
- `/api/brain/chat`
- `/api/telegram/status`
- `/api/telegram/webhook`

## Telegram runtime

Telegram is configurable through env vars:

- `PILOT_TELEGRAM_BOT_TOKEN`
- `PILOT_TELEGRAM_OWNER_ID`
- `TELEGRAM_TRANSPORT=auto|polling|webhook|disabled`
- `BACKEND_PUBLIC_URL`
- `TELEGRAM_WEBHOOK_SECRET`

Transport behavior:

- `auto`: webhook if `BACKEND_PUBLIC_URL` is set, otherwise polling
- `polling`: always use polling
- `webhook`: require public backend URL, otherwise fallback to polling
- `disabled`: turn Telegram runtime off

## Production deployment

Production images and Compose baseline are prepared in:

- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.prod.yml`
- `frontend/nginx.conf`
- `DEPLOYMENT.md`

Frontend production traffic uses nginx and proxies `/api/*` to the backend container, so the frontend can use `/api` instead of a hardcoded host.

Backend production startup runs:

```bash
prisma migrate deploy
node dist/src/main.js
```

This means the deployed container expects committed Prisma migrations to be present in the repository.

## Verification

Current baseline is expected to pass:

```bash
npm run build
npm run test
```

## Notes

- Semantic search is always tenant-filtered.
- DeepSeek chat is live-ready. Embeddings still use deterministic fallback until a dedicated provider is enabled.
- Deadline alerts use Redis-backed queue scheduling.
- Telegram runtime is now prepared for both polling and webhook delivery.
