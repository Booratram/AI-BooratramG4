#!/bin/sh
set -eu

echo "[backend] Running prisma migrate deploy"
npx prisma migrate deploy

echo "[backend] Starting application"
node dist/src/main.js