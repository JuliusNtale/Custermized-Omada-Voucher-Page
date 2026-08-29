# Deploying on the Raspberry Pi

The Pi is memory-constrained (3.7 GB, Omada alone uses ~1.3 GB). Building the
Node image on it pushed it into swap and took 15+ min, so **the backend image
is built off the Pi** and the Pi only pulls it.

## Normal deploy (Pi is online)

```bash
cd ~/Omada-Radius-Server
git pull
docker compose pull backend          # grab the image CI built from main
docker compose up -d                  # recreate only what changed
```

### Migrations (only when `prisma/schema.prisma` changed)

The runtime image has no `prisma` CLI. Build the build-stage image once and run
`migrate deploy` from it:

```bash
docker build --target build -t backend-build ./Backend
docker run --rm --network omada-radius-server_hotspot \
  -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/wifi_business \
  backend-build npx prisma migrate deploy
```

(That `docker build --target build` is small - it stops before the runtime
stage - but still runs `npm install`. On the Pi, prefer running the same
command from a laptop with `DATABASE_URL` pointed at the Pi's `:5432`.)

### Where the image comes from

`.github/workflows/build-backend.yml` builds `linux/arm64` on GitHub's free
native ARM runner on every push to `main` that touches `Backend/**`, and pushes:

- `ghcr.io/neuraltaletechnologies/omada-radius-server-backend:latest`
- `…:sha-<commit>`

The package is **public** (repo is public), so the Pi needs no `docker login`.

## Offline deploy (no internet / no registry)

```bash
# On a build box (Mac/Linux with Docker + buildx):
./scripts/backend-image-offline.sh save        # -> backend-image.tar (~200 MB)
# copy backend-image.tar to the Pi (USB, scp, …)

# On the Pi:
./scripts/backend-image-offline.sh load
docker compose up -d backend
```

The base images (`omada`, `postgres`, `cloudflared`) are all pinned and already
cached on the Pi; a reboot never re-pulls them.

## After a power cut

Nothing to do. `docker` is `systemctl enable`d, every service is
`restart: unless-stopped`, images are local, and the Postgres data volume
persists. The stack comes back on its own; the Cloudflare tunnel reconnects
when the uplink returns.

## Building on the Pi anyway (last resort)

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml build backend
docker compose up -d backend
```

## Memory ceilings

`docker-compose.yml` sets `mem_limit` per service (omada 2 GB, backend 320 MB,
postgres 256 MB, cloudflared 128 MB) as a guardrail so one runaway process
can't take the Pi down. These are ceilings, not reservations. Check headroom:

```bash
free -m
docker stats --no-stream
```
