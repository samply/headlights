# Headlights

Runs Samply explorers locally with everything they need: a local Beam network,
sites with focus and a Blaze holding test data, and the explorer itself.

Each project is one Docker Compose template, `<project>/compose.yaml.j2`. The
`headlights` script renders it with the given config and runs `docker compose`
on the result.

## Requirements

- Docker with Compose
- [minijinja-cli](https://github.com/mitsuhiko/minijinja/tree/main/minijinja-cli):
  `cargo install minijinja-cli`

## Usage

```bash
./headlights [-c config.yaml]... <project> <compose args...>
```

Everything after the project is passed to `docker compose`:

```bash
./headlights dktk-explorer up            # start
./headlights dktk-explorer config        # show the resulting compose file
./headlights dktk-explorer down -v       # stop and delete all data
```

## Config

Config files are YAML, given with `-c` and merged over `defaults.yaml`. Several
files are deep-merged in order, so later files win key by key.

| Key | Default | Effect |
|---|---|---|
| `bind` | `127.0.0.1` | The host address ports are published on |
| `<component>.image` | set by the project | The component's image |
| `<component>.external` | `false` | Don't start the component (and what belongs to it, like Blaze's test data) |
| `<component>.url` | the component's host port on this machine | Where the others reach an external component |

Secrets such as `LLM_API_KEY` are not config: the template passes them from the
environment (or `<project>/.env`) to the services that need them.

For example, to run the dktk-explorer against focus `main` instead of `develop`:

```yaml
# focus-main.yaml
focus:
  image: samply/focus:main
```

```bash
./headlights -c focus-main.yaml dktk-explorer up
```

## Running a component yourself

Mark the component as external and start the rest. `env` prints the
environment the component needs to reach the others on their host ports:

```yaml
# lens-dev.yaml
lens:
  external: true
```

```bash
./headlights -c lens-dev.yaml dktk-explorer up
./headlights -c lens-dev.yaml dktk-explorer env lens > ../lens3/apps/dktk-explorer/.env
```

A component that others connect to, like Blaze, is expected on its host port on
this machine, or at its `url`.

## Container

The image built from `Containerfile` runs one project on its own podman, so
several stacks can run on one host without their ports colliding. The container
is the stack: it runs `up` in the foreground, and removing it removes the stack.

```bash
podman build -t headlights .
podman run -d --name dktk \
  --device /dev/fuse --device /dev/net/tun \
  --security-opt label=disable --security-opt unmask=ALL \
  -v ./config.yaml:/config.yaml:ro \
  -e LLM_API_KEY \
  headlights dktk-explorer
podman exec dktk headlights dktk-explorer ps
```

The stack's ports are published on the container's address. The container
applies `container/config.yaml` before an optional `/config.yaml`, and passes
any further arguments to `docker compose` instead of `up`.

- Private images: mount a Docker config with the registry login at
  `/home/podman/.docker/config.json`.
- Shared images: mount an image store read-only at `/var/lib/shared`. The inner
  podman runs images from it without pulling. Its files must be readable by
  everyone.
