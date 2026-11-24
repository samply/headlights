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
