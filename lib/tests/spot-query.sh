#!/bin/sh
# Sends spot a query and checks that every site runs it, through Beam and
# focus: the result stream must end by itself, with every answer succeeded. A
# site that doesn't answer keeps the stream open until the timeout. The answers
# themselves are not checked.
#
#   spot-query.sh <spot url> [query]
#
# The query is the JSON spot passes on; without one, an empty AST query.
set -u

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
  echo "Usage: $0 <spot url> [query]" >&2
  exit 2
fi

id=$(cat /proc/sys/kernel/random/uuid)
if [ $# -eq 2 ]; then
  query=$(printf '%s' "$2" | base64 | tr -d '\n')
else
  ast='{"ast":{"operand":"OR","children":[]},"id":"'"$id"'"}'
  payload=$(printf '%s' "$ast" | base64 | tr -d '\n')
  query=$(printf '{"lang":"ast","payload":"%s"}' "$payload" | base64 | tr -d '\n')
fi

curl -sfS --max-time 10 -H 'Content-Type: application/json' \
  -d "{\"query\":\"$query\",\"id\":\"$id\"}" "$1/beam" || exit 1

stream=$(curl -sS -N --max-time 60 "$1/beam/$id") || exit 1

answers=$(printf '%s\n' "$stream" |
  grep -oE '"from":"[^"]*",.*"status":"[a-z]+"' |
  sed -E 's/"from":"([^"]*)".*"status":"([^"]*)"/\1 \2/' |
  grep -v ' claimed$')
printf '%s\n' "$answers"
if [ -z "$answers" ]; then
  echo "No site answered"
  exit 1
fi
if printf '%s\n' "$answers" | grep -qv ' succeeded$'; then
  exit 1
fi
