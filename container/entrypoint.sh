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

project=$1
shift
[[ $# -gt 0 ]] || set -- up

stop() {
  headlights "$project" down
  wait "$compose" || true
  kill "$service"
}
trap stop TERM INT

headlights "$project" "$@" &
compose=$!
# Returns early when a signal arrives, and stop() runs before the next line
status=0
wait "$compose" || status=$?
kill "$service" 2>/dev/null || true
wait || true
exit "$status"
