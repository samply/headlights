#!/usr/bin/env bash
# Queries spot with MIABIS and BBMRI.de criteria and checks the exact patient
# counts the bbmri and miabis sites answer together. The generated site is not
# counted.
#
#   counts-test.sh <spot url>
set -euo pipefail

SPOT_URL="$1"
PASS=0
FAIL=0

query_total() {
  local ast_obj="$1"
  # Beam takes each task id once, so every query, and every retry, needs its own
  local id; id=$(cat /proc/sys/kernel/random/uuid)
  local payload query
  payload=$(jq -cn --arg id "${id}" --argjson ast "${ast_obj}" '{"ast":$ast,"id":$id}' | base64 | tr -d '\n')
  query=$(jq -cn --arg p "${payload}" '{"lang":"ast","payload":$p}' | base64 | tr -d '\n')
  curl -sf -m 10 \
    -X POST "${SPOT_URL}/beam" \
    -H "Content-Type: application/json" \
    -d "$(jq -cn --arg q "${query}" --arg id "${id}" '{"query":$q,"id":$id}')" \
  || return 1
  curl -sf -m 30 -N \
    "${SPOT_URL}/beam/${id}" \
  | sed -n 's/^data: //p' \
  | jq -r 'select(.from == "focus.bbmri.broker" or .from == "focus.miabis.broker") | if .status == "succeeded" then (.body | @base64d | fromjson | .totals.patient) else 0 end // 0' \
  | awk '{s+=$1} END {print s+0}'
}

run_scenario() {
  local desc="$1"
  local ast_obj="$2"
  local expected="$3"

  local actual; actual=$(query_total "${ast_obj}" || echo "")

  if [[ "${actual}" == "${expected}" ]]; then
    printf "  ok    %s  (total=%s)\n" "${desc}" "${actual}"
    PASS=$((PASS + 1))
  else
    printf "  FAIL  %s  (expected=%s, got=%s)\n" "${desc}" "${expected}" "${actual}"
    FAIL=$((FAIL + 1))
  fi
}

echo ""

echo "=== Mixed-node scenarios (MIABIS + BBMRI.de, total across both sites) ==="
echo ""

run_scenario \
  "empty AST — all patients (2 MIABIS + 2 BBMRI.de)" \
  '{"operand":"AND","children":[]}' \
  4

run_scenario \
  'storage_temperature = temperatureRoom  (MIABIS RT: p1=1, BBMRI.de Room: bbmri-p2=1)' \
  '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"storage_temperature","type":"EQUALS","system":"","value":"temperatureRoom"}]}]}]}' \
  2

run_scenario \
  'storage_temperature = temperatureLN   (MIABIS LN: p1+p2=2, BBMRI.de LN: bbmri-p1=1)' \
  '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"storage_temperature","type":"EQUALS","system":"","value":"temperatureLN"}]}]}]}' \
  3

run_scenario \
  'sample_kind = blood-plasma            (MIABIS Plasma: p1=1, BBMRI.de blood-plasma: bbmri-p1=1)' \
  '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"sample_kind","type":"EQUALS","system":"","value":"blood-plasma"}]}]}]}' \
  2

run_scenario \
  'sample_kind = whole-blood             (MIABIS WholeBlood: p2=1, BBMRI.de whole-blood: bbmri-p2=1)' \
  '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"sample_kind","type":"EQUALS","system":"","value":"whole-blood"}]}]}]}' \
  2

echo ""
echo "=== BBMRI.de node unaffected by MIABIS workarounds ==="
echo ""

run_scenario \
  'diagnosis C61 (MIABIS: 0, BBMRI.de: bbmri-p2=1)' \
  '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"diagnosis","type":"EQUALS","system":"","value":"C61"}]}]}]}' \
  1

run_scenario \
  'diagnosis C50 (MIABIS: 0, BBMRI.de: bbmri-p1=1)' \
  '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"diagnosis","type":"EQUALS","system":"","value":"C50"}]}]}]}' \
  1

run_scenario \
  'diagnosis C34 (MIABIS: p1=1, BBMRI.de: 0)' \
  '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"diagnosis","type":"EQUALS","system":"","value":"C34"}]}]}]}' \
  1

run_scenario \
  'diagnosis C18 (MIABIS: p2=1 via Condition, BBMRI.de: 0)' \
  '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"diagnosis","type":"EQUALS","system":"","value":"C18"}]}]}]}' \
  1

run_scenario \
  'diagnosis C25 (MIABIS: p2=1 via sample-linked Observation, BBMRI.de: 0)' \
  '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"diagnosis","type":"EQUALS","system":"","value":"C25"}]}]}]}' \
  1

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
echo ""
[ "${FAIL}" -eq 0 ] || exit 1
