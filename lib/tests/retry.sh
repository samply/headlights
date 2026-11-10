#!/bin/sh
# Runs a check until it passes or the timeout runs out, printing each attempt's
# output. Tests wait for the part of the stack they exercise this way, since a
# fresh stack takes a while to settle.
#
#   retry.sh <timeout seconds> <check> [args...]
set -u

if [ $# -lt 2 ]; then
  echo "Usage: $0 <timeout seconds> <check> [args...]" >&2
  exit 2
fi

timeout=$1
shift
deadline=$(($(date +%s) + timeout))
attempt=1

while :; do
  if output=$("$@" 2>&1); then
    printf '%s\n' "$output"
    exit 0
  fi
  echo "Attempt $attempt failed: $output"
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Giving up after ${timeout}s" >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 5
done
