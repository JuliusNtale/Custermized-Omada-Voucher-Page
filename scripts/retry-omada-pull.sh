#!/bin/bash
# Keeps retrying `docker compose up -d omada` until the container is actually
# running (not crash-looping/restarting), to push through an unstable
# connection that drops long-lived HTTPS pulls partway through.
cd "$(dirname "$0")/.." || exit 1

attempt=0
max_attempts=30
while [ "$attempt" -lt "$max_attempts" ]; do
  attempt=$((attempt + 1))
  echo "=== attempt $attempt/$max_attempts at $(date -Iseconds) ==="
  sg docker -c "docker compose up -d omada"

  sleep 8
  status=$(sg docker -c "docker inspect omada-controller --format '{{.State.Status}}'" 2>/dev/null)
  echo "container status: $status"
  if [ "$status" = "running" ]; then
    # give it a bit to crash-loop if it's going to
    sleep 20
    status2=$(sg docker -c "docker inspect omada-controller --format '{{.State.Status}}'" 2>/dev/null)
    if [ "$status2" = "running" ]; then
      echo "SUCCESS: omada-controller is up and stayed running."
      exit 0
    fi
    echo "container went to status '$status2' after settling, retrying..."
  fi
  echo "not yet running, retrying shortly..."
  sleep 5
done

echo "FAILED after $max_attempts attempts."
exit 1
