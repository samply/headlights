#!/bin/sh
# Sends lens an empty query and checks that the site answers with counts. The
# numbers themselves are not checked.
#
#   lens-query.sh <lens url> <site id>
set -u

if [ $# -ne 2 ]; then
  echo "Usage: $0 <lens url> <site id>" >&2
  exit 2
fi

stream=$(curl -sfS -N --max-time 120 \
  -H 'Content-Type: application/json' \
  -d '{"expression":{"kind":"match-all"}}' \
  "$1/api/lens/query") || exit 1

errors=$(printf '%s\n' "$stream" | grep '"type":"error"')
if [ -n "$errors" ]; then
  printf '%s\n' "$errors"
  exit 1
fi

result=$(printf '%s\n' "$stream" | grep '"type":"result"' | grep "\"siteId\":\"$2\"")
if ! printf '%s\n' "$result" | grep -q '"counts":{"[^"]*":[0-9]'; then
  echo "No counts from site $2 in: $stream"
  exit 1
fi
printf '%s\n' "$result"
