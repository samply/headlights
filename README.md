Headlights allows manual end-to-end testing of the federated search tools in the [Samply](https://github.com/samply/) organization. The repository is organized into project directories that contain a project-specific README file, Docker Compose files, and optionally synthetic data. You can get started by copying a command from one of the project-specific README files to spin up a test environment. Note that running in bridgehead mode requires that you set up of a PKI directory and create a `.env.beam` file as described in the [bridgehead mode](#bridgehead-mode) section.

## Local mode

![Local mode sketch](./local-mode-sketch.svg)

In local mode all components are running locally. This includes a local [Beam](https://github.com/samply/beam) network and a local database (typically [Blaze](https://github.com/samply/blaze)) that is filled with synthetic data. Projects supporting local mode have a `compose.local.yaml` file in their project directory. Run a project in local mode as follows:

```bash
docker compose up -f [PROJECT DIRECTORY]/compose.local.yaml up --pull always
```

Each `compose.local.yaml` file uses the `compose.localbeam.yaml` file in the root of the repository by including it:

```
include:
  - ../compose.localbeam.yaml
```

The `compose.localbeam.yaml` file brings up a local Beam network with the following Beam proxies:

| Service name | Beam proxy ID | Intended use | Host port | Configured apps (key = `pass123`)
| ----- | ----- | --- | --- | --- |
| `proxy1` | `proxy1.broker` | Connect frontend via Spot | `8081` | `spot`, `prism` |
| `proxy2` | `proxy2.broker` | Connect database via Focus | `8082` | `focus` |
| `proxy3` | `proxy3.broker` | Connect database via Focus (optional) | `8083` | `focus` |
| `proxy4` | `proxy4.broker` | Connect database via Focus (optional) | `8084` | `focus` |


## Bridgehead mode

![Bridgehead mode sketch](./bridgehead-mode-sketch.svg)

In bridgehead mode data is fetched from real bridgeheads. This requires that you have a development proxy enrolled in the Beam network. Headlights requires that you organize your Beam keys in a PKI directory that contains one directory per Beam broker. Each such directory must contain the broker root certificate in `root.crt.pem` and your private key in a file named after the proxy ID with the `.priv.pem` file extension. For example if your name is John your PKI directory may look as follows:

```
/home/john/pki
├── broker.bbmri.samply.de
│   ├── dev-john.priv.pem
│   └── root.crt.pem
└── broker.ccp-it.dktk.dkfz.de
    ├── dev-john.priv.pem
    └── root.crt.pem
```

In the root of the repository create the `.env.beam` file containing your development proxy ID and the path to your PKI directory. For example:

```
DEV_PROXY=dev-john
PKI_PATH=/home/john/pki
```

Now you are ready to use bridgehead mode. Projects supporting bridgehead mode have a `compose.bridgehead.yaml` file in their project directory. Run a project in bridgehead mode as follows:

```bash
docker compose up -f [PROJECT DIRECTORY]/compose.bridgehead.yaml --env-file .env.beam up --pull always
```

Each `compose.bridgehead.yaml` file defines the `proxy1` service that uses the private key from the PKI directory to connect to the Beam network. For example:

```yaml
  proxy1:
    image: samply/beam-proxy:main
    ports:
      - 8081:8081
    environment:
      BROKER_URL: https://broker.bbmri.samply.de
      PROXY_ID: ${DEV_PROXY}.broker.bbmri.samply.de
      PRIVKEY_FILE: /pki/${DEV_PROXY}.priv.pem
      ROOTCERT_FILE: /pki/root.crt.pem
      APP_spot_KEY: pass123
      APP_prism_KEY: pass123
    volumes:
      - ${PKI_PATH}/broker.bbmri.samply.de:/pki:ro
```

## Override files

## Running individual components from source

## Adding a project to Headlights
