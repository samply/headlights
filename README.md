# Headlights

Runs Samply explorers locally with everything they need: a local Beam network,
sites with focus and a Blaze holding test data, and the explorers themselves.

Each project is one Docker Compose template, `<project>/compose.yaml.j2`. The
`headlights` script renders it with the project's config and runs
`docker compose` on the result.

| Project | Explorers | Sites |
|---|---|---|
| `dktk` | lens3, lens2 (DKTK explorer) | one, with test patients from `dktk/testdata` |
| `dhki` | lens3, lens2 (DHKI explorer) | one, empty by default |
| `bbmri` | lens2 (Sample Locator) with prism | `bbmri` with bbmri-fhir-gen data, `miabis` with MIABIS-on-FHIR data |
| `bbmri-negotiator` | lens2 (Sample Locator) with prism, and the Negotiator | the two Headlights biobanks with small fixtures |
| `eucaim` | lens2 (EUCAIM explorer) | `chaimeleon` and `procanceri`, each answering with canned OMOP responses |
| `siorgp` | the organoid dashboard (public and internal) | one, with Blaze and its SQL tables (fhir2sql) |
| `mnpoc` | lens3 | none: it queries YAASB, which is not part of the stack yet |

## Requirements

- Docker with Compose, or podman with docker-compose
- [minijinja-cli](https://github.com/mitsuhiko/minijinja/tree/main/minijinja-cli):
  a prebuilt binary from its
  [releases](https://github.com/mitsuhiko/minijinja/releases), or
  `cargo install minijinja-cli`
- [yq](https://github.com/mikefarah/yq) v4 by mikefarah, e.g. a prebuilt binary
  from its releases. Not the Python `yq` some distributions ship under that name.

## Usage

```bash
./headlights [-c config.yaml]... <project> <compose args...>
```

Everything after the project is passed to `docker compose`. Many images are
tags like `main` or `latest`, so pull them on each start:

```bash
./headlights dktk up --pull always      # start, with the newest images
```

With Claude, you can use headlights through the `/headlights` skill.

## Network

Every service publishes its port 1:1 on the host, on every interface, and
reaches the others through the host at `host.docker.internal:<port>`. So it
makes no difference whether a service runs in a container or on your machine.
The stack is reachable from your network while it runs.

The ports are set in `defaults.yaml` and `<project>/defaults.yaml`.
Projects share them, so run one at a time or give the others different ports
in an overlay.

## Config

Config files are YAML, merged key by key: `defaults.yaml` first, then
`<project>/defaults.yaml`, then the files given with `-c`, later ones winning.

| Key | Default | Effect |
|---|---|---|
| `images.<kind>` | `defaults.yaml`, `<project>/defaults.yaml` | The image of every service of that kind: a tag or a whole image |
| `services.<service>.port` | `defaults.yaml`, `<project>/defaults.yaml` | Where the service listens and is published |
| `services.<service>.omit` | `false` | `true` leaves the service out, e.g. to run it yourself |

Secrets such as `LLM_API_KEY` are not config: the template passes them from the
environment (or `<project>/.env`) to the services that need them.

## Running a service yourself

To run a service yourself, e.g. focus from its repo, leave it out of the stack
with `omit: true`:

```yaml
# no-focus.yaml
services:
  focus:
    omit: true
```

Then start the stack with that config, and run focus with
`env`, which gives it the environment it needs to reach the stack:

```bash
../headlights/headlights -c no-focus.yaml dktk up -d --pull always
../headlights/headlights -c no-focus.yaml dktk env focus cargo run
```

Without a command, `env` prints that environment instead, e.g. for a `.env`
file.

## Test data

A site's Blaze is filled by `load-<blaze>` (`lib/blaze.j2`), which uploads the
FHIR bundles (`*.json`, `*.xml`) it is given:

- from a directory in the project, or
- from a producer: a one-shot service that writes them to a volume and exits.
  It can copy them out of an image (dhki), generate them (bbmri), or download
  them.

The loader stores a hash of the bundles in Blaze. On the next `up` it skips
loading when nothing changed, and empties Blaze and loads again when something
did.

## Tests

`test` runs a project's tests against its running stack:

```bash
./headlights dktk up -d --pull always
./headlights dktk test
```

A test is a service in the `test` profile, so `up` leaves it out. Its exit code
is the result. A test retries its check with `lib/tests/retry.sh` until the
part of the stack it exercises works, so it can start right after `up`. Tests
that several projects share are macros in `lib/tests.j2`.

## Negotiator

`bbmri-negotiator` extends the bbmri stack with the Negotiator and tests the
complete Locator-to-Negotiator handoff: the search, the selection, the handoff
request, the redirect, the OIDC login, and the resulting draft in the
Negotiator's GUI. Search runs against the two small Headlights biobanks from
`bbmri-negotiator/negotiator/fixtures.json` instead of the generated site, and
only the Directory metadata is a fixture. Negotiator and its frontend are
pinned to 3.23.0 because the assertions couple to its handoff API and rendered
markup, and Focus to 0.25.1 because 0.26 renamed the Custodian stratifier
before Lens learned the new name (see `bbmri-negotiator/defaults.yaml`). The
Locator floats on `:main` as the system under test.

```bash
./headlights bbmri-negotiator up -d --pull always
./headlights bbmri-negotiator test
```

Start the stack with `up` first: `test` only starts the test service's
dependencies, and the Locator would come up without its search backend. Open
http://localhost:3000/search/, select either or both Headlights biobanks,
click **Negotiate with biobanks**, and log in as `Researcher` with password
`researcher`. The Negotiator at http://localhost:8090 turns the handoff into a
draft. All accounts and data are local test fixtures. Use these localhost URLs
exactly: the OIDC redirect and the discovery registration depend on them, and
Negotiator strips the port when matching the Locator's `http://localhost:3000`
against the seeded `http://localhost`.

`bbmri-negotiator/negotiator/fixtures.json` is the single source of truth for
the FHIR data of both sites, the Locator's site mappings and negotiation
options, the Directory metadata, the Negotiator's seed migration, and the four
test scenarios. The fixture contract is checked without Docker:

```bash
node --test bbmri-negotiator/negotiator/fixtures.test.mjs
```

The browser test runs the four scenarios in Chromium, Firefox, and WebKit, one
worker at a time: `setup.mjs` mints one OIDC user per browser, scenario, and
retry, so Negotiator's automatic draft merging cannot leak between tests, and
successful tests delete their drafts. Failure artifacts — traces, videos,
screenshots, the handoff payload, and the report — land in the project's
`test-results/` and `playwright-report/` directories.

Reset with `down -v` before repeating a failed run or after changing fixtures:

```bash
./headlights bbmri-negotiator down -v
```

That deletes the project's volumes, including the Negotiator's drafts and
database. With unchanged fixtures, plain `down` and `up` cycles are fine:
Flyway re-validates the unchanged seed and the loaders skip unchanged test
data. Editing `fixtures.json` or `fixtures.mjs` changes the seed's checksum,
and any database that applied the previous seed then refuses to start with
`Migration checksum mismatch for migration version 1000` — that means the
reset was skipped, not that the fixtures are broken.

The Locator runs from a child image (`negotiator/locator.Dockerfile`) that
only replaces the published image's `CMD` with an entrypoint loading the
fixture-generated options into `PUBLIC_LENS_OPTIONS` before the server starts:
Compose cannot interpolate file contents into an environment variable, and the
options live in a volume, not on the host. `DIRECTORY_GRAPHQL_ENDPOINT` is a
plain environment variable pointing at the Directory fixture.

## Container

The image built from `Containerfile` runs one project on its own podman, so
several stacks can run on one host without their ports colliding. It is meant
for CI and previews; for local development, use `./headlights` directly. The
container is the stack: it runs `up` in the foreground, and removing it removes
the stack.

```bash
podman build -t headlights .
podman run -d --name dktk \
  --device /dev/fuse --device /dev/net/tun \
  --security-opt label=disable --security-opt unmask=ALL \
  -v ./config.yaml:/config.yaml:ro \
  -e LLM_API_KEY \
  headlights dktk
podman exec dktk headlights dktk test
```

The stack's ports are published inside the container only; publish the ones
you need with `-p`. The container applies an optional `/config.yaml`, and passes
any further arguments to `docker compose` instead of `up`.

- Services on the real host: give them `omit: true`. The stack reaches
  `host.docker.internal:<port>` on the real host for every port it doesn't
  publish itself, if the service there listens on every interface.
- Private images: mount a Docker config with the registry login at
  `/home/podman/.docker/config.json`.
- Shared images: mount an image store read-only at `/var/lib/shared`. The inner
  podman runs images from it without pulling. Its files must be readable by
  everyone.
