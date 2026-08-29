#!/usr/bin/env bash
# Move the backend image between machines WITHOUT a registry or internet
# (e.g. onto the Pi via a USB stick or a LAN scp).
#
#   On a build box (arm64, or with buildx + QEMU):
#       ./scripts/backend-image-offline.sh save
#     -> produces ./backend-image.tar  (copy this to the Pi)
#
#   On the Pi:
#       ./scripts/backend-image-offline.sh load
#       docker compose up -d backend
#
# The image tag matches docker-compose.yml so `up -d` just uses it.
set -euo pipefail

IMAGE="ghcr.io/neuraltaletechnologies/omada-radius-server-backend:latest"
TAR="${TAR:-backend-image.tar}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "${1:-}" in
  save)
    echo ">> building $IMAGE (linux/arm64) from $REPO_ROOT/Backend"
    docker buildx build \
      --platform linux/arm64 \
      --provenance=false --sbom=false \
      -t "$IMAGE" \
      --load \
      "$REPO_ROOT/Backend"
    echo ">> saving to $TAR"
    docker save "$IMAGE" -o "$TAR"
    ls -lh "$TAR"
    echo ">> copy $TAR to the Pi, then: ./scripts/backend-image-offline.sh load"
    ;;
  load)
    [ -f "$TAR" ] || { echo "!! $TAR not found (expected in $(pwd))" >&2; exit 1; }
    echo ">> loading $TAR"
    docker load -i "$TAR"
    echo ">> done. Now: docker compose up -d backend"
    ;;
  *)
    echo "usage: $0 {save|load}   (TAR=path to override ./backend-image.tar)" >&2
    exit 2
    ;;
esac
