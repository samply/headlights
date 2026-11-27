#!/bin/bash
# Starts the container's podman and runs a headlights project on it:
#   <project> [compose args...]    compose args default to `up`
# Stays PID 1 so that stopping the container takes the stack down.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: <project> [compose args...]" >&2
  exit 2
fi

podman system service --time=0 "$DOCKER_HOST" &
service=$!
until [[ -S ${DOCKER_HOST#unix://} ]]; do sleep 0.1; done

# podman schedules health checks with systemd timers, and there is no systemd
# here: without this loop no container ever turns healthy, and every
# depends_on with `condition: service_healthy` waits forever. It ignores each
# check's own interval and runs them all every few seconds.
(
  while sleep 5; do
    for id in $(podman ps -q --filter health=starting \
      --filter health=healthy --filter health=unhealthy 2>/dev/null); do
      podman healthcheck run "$id" >/dev/null 2>&1 &
    done
    wait
  done
) &
healthchecks=$!

project=$1
shift
[[ $# -gt 0 ]] || set -- up

stop() {
  headlights "$project" down
  wait "$compose" || true
  kill "$healthchecks" "$service"
}
trap stop TERM INT

headlights "$project" "$@" &
compose=$!
# Returns early when a signal arrives, and stop() runs before the next line
status=0
wait "$compose" || status=$?
kill "$healthchecks" "$service" 2>/dev/null || true
wait || true
exit "$status"
