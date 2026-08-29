#!/bin/sh
# Container entrypoint: bring the SQLite database up to date, then run the app.
#
# The DB is a single file on a Docker volume (DATABASE_URL=file:/data/...), so
# migrations + seed run here on every start - they are idempotent and cheap,
# and this removes the "remember to run migrations" deploy step entirely.
set -e

echo "[entrypoint] prisma migrate deploy"
npx prisma migrate deploy

echo "[entrypoint] seed catalog (idempotent)"
node dist/scripts/seed.js

echo "[entrypoint] starting backend"
exec node dist/index.js
