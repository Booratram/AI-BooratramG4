# Deployment Guide

## 1. Goal

This document describes the intended production bootstrap for BooratramG4 from the repository state alone, including automated deploy and rollback.

The production path assumes:

- committed Prisma migrations
- `.env` with real secrets and public URLs
- Docker available on the target host
- Redis persistence enabled for delayed deadline jobs
- repository cloned on the target host with `origin` access to GitHub

## 2. Required environment

At minimum set these values in production `.env`:

```env
POSTGRES_DB=booratramg4
POSTGRES_USER=postgres
POSTGRES_PASSWORD=strong-password
DATABASE_URL_DOCKER=postgresql://postgres:strong-password@postgres:5432/booratramg4
REDIS_URL_DOCKER=redis://redis:6379
JWT_SECRET=strong-random-secret
DEEPSEEK_API_KEY=...
EMBEDDING_PROVIDER=auto
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
FRONTEND_URL=https://your-frontend-domain
BACKEND_PUBLIC_URL=https://your-backend-domain
PILOT_TENANT_SLUG=bg-studio-ai
PILOT_TELEGRAM_BOT_TOKEN=...
PILOT_TELEGRAM_OWNER_ID=...
TELEGRAM_TRANSPORT=webhook
TELEGRAM_WEBHOOK_SECRET=strong-random-string
```

If frontend and backend are served from the same public host behind reverse proxy, align `FRONTEND_URL` and `BACKEND_PUBLIC_URL` accordingly.

If you need offline or bootstrap-only embeddings, set:

```env
EMBEDDING_PROVIDER=deterministic
```

## 3. Production bootstrap

Build and start:

```bash
npm run prod:build
npm run prod:up
```

First-time server bootstrap:

```bash
git clone git@github.com:Booratram/AI-BooratramG4.git /opt/booratramg4
cd /opt/booratramg4
cp .env.example .env
# fill real secrets in .env
```

What happens during backend startup:

1. container starts
2. `prisma migrate deploy` runs
3. backend starts from built `dist`
4. frontend serves static files through nginx
5. nginx proxies `/api/*` to backend
6. Redis keeps append-only persistence for queued alerts

## 4. Embeddings rollout

To enable live embeddings in production:

1. set `OPENAI_API_KEY`
2. keep `EMBEDDING_PROVIDER=auto` or switch to `openai`
3. redeploy
4. backfill existing memory vectors

```bash
npm run embeddings:backfill
```

Useful overrides:

```bash
MEMORY_EMBED_BACKFILL_TENANT_ID=tenant-id npm run embeddings:backfill
MEMORY_EMBED_BACKFILL_FORCE=true npm run embeddings:backfill
```

## 5. Health verification

Check:

```bash
docker compose -f docker-compose.prod.yml config
curl http://localhost:3003/api/health
curl http://localhost:8080
curl http://localhost:3003/api/telegram/status
curl http://localhost:3003/api/brain/status
```

## 6. GitHub Actions deploy and rollback

The repository now includes:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `ops/deploy/deploy.sh`
- `ops/deploy/rollback.sh`

GitHub Actions production secrets:

- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`

Expected server state:

- repo cloned at `DEPLOY_PATH`
- production `.env` already present
- Docker installed and available to the deploy user
- the server clone can run `git fetch origin`

Automatic deployment:

- `ci` runs build, tests, and Playwright smoke
- after successful `ci` on `main`, `deploy.yml` connects over SSH and runs `bash ops/deploy/deploy.sh <sha>`

Manual workflow dispatch supports:

- `deploy` for a specific SHA
- `rollback` to the previous successful SHA or to an explicit SHA

Server-side deployment state is stored in `.deploy-state/`:

- `current.sha`
- `previous.sha`
- `last_success.sha`
- `last_attempt.sha`
- `last_failed.sha`
- `last_rollback.sha`

If deploy healthchecks fail, `ops/deploy/deploy.sh` automatically rolls back to the previous successful SHA by default.

## 7. Telegram deployment modes

### Polling

Use when running a single backend instance and no public webhook endpoint is available.

```env
TELEGRAM_TRANSPORT=polling
```

### Webhook

Use in production when backend is reachable from Telegram.

```env
TELEGRAM_TRANSPORT=webhook
BACKEND_PUBLIC_URL=https://your-backend-domain
TELEGRAM_WEBHOOK_SECRET=strong-random-string
```

Webhook endpoint:

```text
POST /api/telegram/webhook
```

Telegram secret validation uses header:

```text
x-telegram-bot-api-secret-token
```

For local and e2e webhook tests without real Telegram API calls:

```env
TELEGRAM_SKIP_REMOTE_API=true
```

## 8. Database lifecycle

For an already provisioned environment, the correct path is:

```bash
npm run db:deploy
npm run seed
```

Do not use `prisma migrate dev` in production.

## 9. Recommended next hardening

- Put nginx or a cloud load balancer in front of the stack
- Terminate TLS outside the containers
- Store `.env` in a secrets manager or deployment system, not in git
- Add automated backup for PostgreSQL volume
- Add backup/retention policy for Redis AOF if deadline queue history matters
- Add centralized logs and uptime monitoring
- Add remote observability hooks to deploy/rollback events