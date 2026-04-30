#!/usr/bin/env bash
set -euo pipefail

SPOT_URL="http://localhost:8055"
PASS=0
FAIL=0

wait_for_spot() {
    echo -n "Waiting for Spot..."
    until curl -sf -o /dev/null "${SPOT_URL}/health" 2>/dev/null; do
        printf '.'; sleep 2
    done
    echo " ready."
}

query_total() {
    local ast_obj="$1"
    local id="$2"
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
    | jq -r 'if .status == "succeeded" then (.body | @base64d | fromjson | .totals.patient) else 0 end // 0' \
    | awk '{s+=$1} END {print s+0}'
}

run_scenario() {
    local desc="$1"
    local ast_obj="$2"
    local id="$3"
    local expected="$4"

    local actual; actual=$(query_total "${ast_obj}" "${id}" || echo "")

    if [[ "${actual}" == "${expected}" ]]; then
        printf "  ok    %s  (total=%s)\n" "${desc}" "${actual}"
        PASS=$((PASS + 1))
    else
        printf "  FAIL  %s  (expected=%s, got=%s)\n" "${desc}" "${expected}" "${actual}"
        FAIL=$((FAIL + 1))
    fi
}

wait_for_spot
echo ""

echo "=== Mixed-node scenarios (MIABIS + BBMRI.de, total across both sites) ==="
echo ""

run_scenario \
    "empty AST — all patients (2 MIABIS + 2 BBMRI.de)" \
    '{"operand":"AND","children":[]}' \
    "00000000-0000-0000-0000-000000000000" \
    4

run_scenario \
    'storage_temperature = temperatureRoom  (MIABIS RT: p1=1, BBMRI.de Room: bbmri-p2=1)' \
    '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"storage_temperature","type":"EQUALS","system":"","value":"temperatureRoom"}]}]}]}' \
    "00000000-0000-0000-0000-000000000001" \
    2

run_scenario \
    'storage_temperature = temperatureLN   (MIABIS LN: p1+p2=2, BBMRI.de LN: bbmri-p1=1)' \
    '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"storage_temperature","type":"EQUALS","system":"","value":"temperatureLN"}]}]}]}' \
    "00000000-0000-0000-0000-000000000002" \
    3

run_scenario \
    'sample_kind = blood-plasma            (MIABIS Plasma: p1=1, BBMRI.de blood-plasma: bbmri-p1=1)' \
    '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"sample_kind","type":"EQUALS","system":"","value":"blood-plasma"}]}]}]}' \
    "00000000-0000-0000-0000-000000000003" \
    2

run_scenario \
    'sample_kind = whole-blood             (MIABIS WholeBlood: p2=1, BBMRI.de whole-blood: bbmri-p2=1)' \
    '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"sample_kind","type":"EQUALS","system":"","value":"whole-blood"}]}]}]}' \
    "00000000-0000-0000-0000-000000000004" \
    2

echo ""
echo "=== BBMRI.de node unaffected by MIABIS workarounds ==="
echo ""

run_scenario \
    'diagnosis C61 (MIABIS: 0, BBMRI.de: bbmri-p2=1)' \
    '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"diagnosis","type":"EQUALS","system":"","value":"C61"}]}]}]}' \
    "00000000-0000-0000-0000-000000000005" \
    1

run_scenario \
    'diagnosis C50 (MIABIS: 0, BBMRI.de: bbmri-p1=1)' \
    '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"diagnosis","type":"EQUALS","system":"","value":"C50"}]}]}]}' \
    "00000000-0000-0000-0000-000000000006" \
    1

run_scenario \
    'diagnosis C34 (MIABIS: p1=1, BBMRI.de: 0)' \
    '{"operand":"OR","children":[{"operand":"AND","children":[{"operand":"OR","children":[{"key":"diagnosis","type":"EQUALS","system":"","value":"C34"}]}]}]}' \
    "00000000-0000-0000-0000-000000000007" \
    1

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
echo ""
[ "${FAIL}" -eq 0 ] || exit 1
