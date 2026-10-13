set shell := ["bash", "-euo", "pipefail", "-c"]

# ---- parcours (github.com/samply/parcours-runtime) ---------------------------------------
#
# One suite per project directory: dev/parcours/<project>/index.mjs plays its stories against
# that project's compose.local.yaml. Stacks bind fixed host ports (3000, 8055, 4001…), so two
# of them cannot run at once: `parcours-wrap` holds a lock from bringing a stack up until its
# play ends, and takes down whichever other parcours stack still holds the ports (one kept
# for inspection after a failed play).

parcours_project := "headlights"
parcours_suites := "bbmri-sample-locator"
parcours_runner := "--network host"
parcours_ab_copy := "dev/parcours justfile"
parcours_compose := "docker compose -p headlights-parcours-" + env("PARCOURS_STACK", "local")
parcours_lock := "/tmp/headlights-parcours.lock"

[positional-arguments]
[doc("The parcours (screens + behaviour, before/after): read `just parcours guide` first, then `just parcours --list`")]
[group('parcours')]
parcours *args:
  @[ -d /tmp/parcours-runtime ] || git clone -q --depth 1 git@github.com:samply/parcours-runtime.git /tmp/parcours-runtime
  @/tmp/parcours-runtime/bin/parcours "{{ justfile_directory() }}" "$@"

# Only what is safe to do in parallel: drop this stack's previous incarnation, so `run` starts
# fresh, and pull. The stack comes up in `parcours-wrap`, under the lock.
[private]
parcours-up suite label:
  {{ parcours_compose }} -f {{ suite }}/compose.local.yaml down --volumes --remove-orphans
  {{ parcours_compose }} -f {{ suite }}/compose.local.yaml pull --quiet --ignore-pull-failures

[private]
parcours-down suite:
  {{ parcours_compose }} -f {{ suite }}/compose.local.yaml down --volumes --remove-orphans

[private]
[positional-arguments]
parcours-wrap suite *cmd:
  #!/usr/bin/env bash
  set -euo pipefail
  shift
  exec 9>"{{ parcours_lock }}"
  flock 9
  mine="headlights-parcours-$PARCOURS_STACK"
  for other in $(docker compose ls --all --quiet --filter name=headlights-parcours-); do
    [[ "$other" == "$mine" ]] || docker compose -p "$other" down --volumes --remove-orphans
  done
  busy="$(ss -Hltn | awk '{print $4}' | grep -E ':(3000|8055|8056|8080|400[0-4])$' || true)"
  if [[ -n "$busy" && -z "$(docker compose ls --quiet --filter name="^$mine\$")" ]]; then
    echo "ports in use, stop whatever holds them first:" $busy >&2
    exit 1
  fi
  # A stack still up (kept after a failed play) is played again as it is: pki-setup cannot
  # run twice against the same Vault.
  if [[ -z "$({{ parcours_compose }} -f {{ suite }}/compose.local.yaml ps --status running --quiet lens)" ]]; then
    {{ parcours_compose }} -f {{ suite }}/compose.local.yaml down --volumes --remove-orphans
    {{ parcours_compose }} -f {{ suite }}/compose.local.yaml up -d --scale playwright=0
  fi
  # `compose wait` misses a container that has already exited.
  until [[ "$({{ parcours_compose }} -f {{ suite }}/compose.local.yaml ps -a --format '{{{{.State}}' test-data-loader)" == exited ]]; do sleep 2; done
  code="$({{ parcours_compose }} -f {{ suite }}/compose.local.yaml ps -a --format '{{{{.ExitCode}}' test-data-loader)"
  [[ "$code" == 0 ]] || { echo "test-data-loader exited with $code" >&2; exit 1; }
  "$@"
