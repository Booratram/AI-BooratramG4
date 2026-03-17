# Deployment Guide

## 1. Goal

This document describes the intended production bootstrap for BooratramG4 from the repository state alone.

The production path assumes:

- committed Prisma migrations
- `.env` with real secrets and public URLs
- Docker available on the target host
- Redis persistence enabled for delayed deadline jobs

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
FRONTEND_URL=https://your-frontend-domain
BACKEND_PUBLIC_URL=https://your-backend-domain
PILOT_TENANT_SLUG=bg-studio-ai
PILOT_TELEGRAM_BOT_TOKEN=...
PILOT_TELEGRAM_OWNER_ID=...
TELEGRAM_TRANSPORT=webhook
TELEGRAM_WEBHOOK_SECRET=strong-random-string
```

If frontend and backend are served from the same public host behind reverse proxy, align `FRONTEND_URL` and `BACKEND_PUBLIC_URL` accordingly.

## 3. Production bootstrap

Build and start:

```bash
npm run prod:build
npm run prod:up
```

What happens during backend startup:

1. container starts
2. `prisma migrate deploy` runs
3. backend starts from built `dist`
4. frontend serves static files through nginx
5. nginx proxies `/api/*` to backend
6. Redis keeps append-only persistence for queued alerts

## 4. Health verification

Check:

```bash
docker compose -f docker-compose.prod.yml config
curl http://localhost:3003/api/health
curl http://localhost:8080
curl http://localhost:3003/api/telegram/status
curl http://localhost:3003/api/brain/status
```

## 5. Telegram deployment modes

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

## 6. Database lifecycle

For an already provisioned environment, the correct path is:

```bash
npm run db:deploy
npm run seed
```

Do not use `prisma migrate dev` in production.

## 7. Recommended next hardening

- Put nginx or a cloud load balancer in front of the stack
- Terminate TLS outside the containers
- Store `.env` in a secrets manager or deployment system, not in git
- Add automated backup for PostgreSQL volume
- Add backup/retention policy for Redis AOF if deadline queue history matters
- Add centralized logs and uptime monitoring
- Add browser e2e smoke checks in CI/CD
