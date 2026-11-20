#!/bin/sh
# Sends lens an empty query and checks that every site answers with counts:
# the stream must end with `done`, without errors. A site that doesn't answer
# keeps the stream open until the timeout. The numbers themselves are not
# checked.
#
#   lens-query.sh <lens url>
set -u

if [ $# -ne 1 ]; then
  echo "Usage: $0 <lens url>" >&2
  exit 2
fi

stream=$(curl -sfS -N --max-time 60 \
  -H 'Content-Type: application/json' \
  -d '{"expression":{"kind":"match-all"}}' \
  "$1/api/lens/query") || exit 1

results=$(printf '%s\n' "$stream" | grep '"type":"result"')
printf '%s\n' "$results"
if printf '%s\n' "$stream" | grep '"type":"error"'; then
  exit 1
fi
if ! printf '%s\n' "$stream" | grep -q '"type":"done"'; then
  echo "The stream ended without done"
  exit 1
fi
if ! printf '%s\n' "$results" | grep -q '"counts":{"[^"]*":[0-9]'; then
  echo "No counts in: $stream"
  exit 1
fi
