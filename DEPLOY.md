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

**One-time:** GHCR packages start **private** even for a public repo. Pick one:

- **Make it public** (recommended - the image has no secrets, they come from
  `.env` at runtime): github.com/orgs/neuraltaletechnologies/packages →
  `omada-radius-server-backend` → *Package settings* → *Change visibility* →
  *Public*. Then the Pi pulls with no login, forever.
- **Or authenticate the Pi**: create a classic PAT with `read:packages` (no
  expiry), then once on the Pi:
  ```bash
  echo <PAT> | docker login ghcr.io -u JuliusNtale --password-stdin
  ```
  The credential is saved in `~/.docker/config.json` and survives reboots.

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

## Memory ceilings (optional, needs a reboot)

`docker-compose.yml` has `mem_limit` lines per service **commented out**.
Raspberry Pi OS ships with the memory cgroup controller disabled, so Docker
would just print "kernel does not support memory limit" and ignore them.

To turn them on:

1. Append to `/boot/firmware/cmdline.txt` (one line, space-separated, no newline):
   ```
   cgroup_enable=memory cgroup_memory=1
   ```
2. `sudo reboot`
3. Confirm: `cat /sys/fs/cgroup/cgroup.controllers` now lists `memory`
4. Uncomment the `mem_limit:` lines in `docker-compose.yml`, then
   `docker compose up -d`

Suggested ceilings: omada 2g, backend 320m, postgres 256m, cloudflared 128m
(ceilings, not reservations). Check headroom any time:

```bash
free -m
docker stats --no-stream
```

Since the backend image is no longer built on the Pi, the big RAM spike is
already gone - the ceilings are just a guardrail, not essential.
