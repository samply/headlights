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
| `name` | `""`, meaning the project name | The compose project name. It prefixes containers, networks and volumes |
| `lens.image` | set by the project | The explorer image |
| `focus.image` | set by the project | The focus image |

For example, to run the dktk-explorer against focus `main` instead of `develop`:

```yaml
# focus-main.yaml
focus:
  image: samply/focus:main
```

```bash
./headlights -c focus-main.yaml dktk-explorer up
```
