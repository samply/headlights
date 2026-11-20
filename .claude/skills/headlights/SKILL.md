---
name: headlights
description: Runs a headlights stack, e.g. an explorer such as dktk locally.
---

# headlights

1. Work out the project, which services run from source, and what else
   differs from the defaults.
2. Check the dependencies and repos that apply. Collect everything that is
   missing, then ask about all of it at once. Never install or clone without a
   yes.
3. Clone and install what was approved.
4. If anything differs from the defaults, write it to a config file of your
   own in a temporary location, and pass it with `-c` to every `./headlights`
   call for this stack. Services from source get `omit: true` under
   `services`, so `up` leaves them out. If the table below names a dev config
   for them, read it and take from it what the request needs.
5. Start the stack in its own tab: in Claude Desktop the built-in Terminal
   panel, otherwise a background command.
   `./headlights <configs> <project> up --pull always`.
6. Start each service from source in its own tab. In its checkout, run
   `../headlights/headlights <configs> <project> env <service> <command>`,
   with `<command>` from the table. `env` adds the environment the service
   needs to join the stack.
7. Report the explorer URLs.

## Dependencies

- Docker Compose
- minijinja-cli
- yq v4 by mikefarah, not the Python `yq`

## Services from source

| Service | Repo | Tools | Dev config | Command |
|---|---|---|---|---|
| lens3 | `lens3` | Node, pnpm | `<repo>/apps/<app>/headlights.yaml` | `pnpm install`, then `pnpm turbo dev --filter=<app>...` |
| lens2 | named like the image, e.g. `ccp-explorer` | Node | | `npm install`, then `npm run dev` |
| spot | `rustyspot` | Rust | | `cargo run` |
| focus | `focus` | Rust | | `cargo run` |

Repos go next to this one (`../<repo>`); suggest cloning missing ones from
github.com/samply.
