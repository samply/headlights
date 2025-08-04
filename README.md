Headlights allows manual end-to-end testing of the federated search tools in the [Samply](https://github.com/samply/) organization. The repository is organized into project directories that contain a project README file, Docker Compose files, and optionally synthetic data. You can get started by copying a command from one of the project README files. Note that running in bridgehead mode requires that you set up of a PKI directory and create a `.env.beam` file as described in the [bridgehead mode](#bridgehead-mode) section.

## Local mode

![Local mode sketch](./local-mode-sketch.svg)

In local mode all components are running locally. This includes a local [Beam](https://github.com/samply/beam) network and a local database (typically [Blaze](https://github.com/samply/blaze)) that is filled with synthetic data. Projects supporting local mode have a `compose.local.yaml` file in their project directory. Run a project in local mode as follows:

```bash
docker compose up -f [PROJECT DIRECTORY]/compose.local.yaml up --pull always
```

`compose.local.yaml` files use the `compose.localbeam.yaml` file in the root of the repository by including it:

```
include:
  - ../compose.localbeam.yaml
```

The `compose.localbeam.yaml` file brings up a local Beam network consisting of a Beam broker and the following Beam proxies:

| Service name | Beam proxy ID | Intended use | Host port | Configured apps |
| ----- | ----- | --- | --- | --- |
| `proxy1` | `proxy1.broker` | Connect frontend via Spot | `8081` | `spot`, `prism` |
| `proxy2` | `proxy2.broker` | Connect database via Focus | `8082` | `focus` |
| `proxy3` | `proxy3.broker` | Connect database via Focus (optional) | `8083` | `focus` |
| `proxy4` | `proxy4.broker` | Connect database via Focus (optional) | `8084` | `focus` |

All apps use the key `pass123` to connect to a local proxy.

## Bridgehead mode

![Bridgehead mode sketch](./bridgehead-mode-sketch.svg)

In bridgehead mode data is fetched from real bridgeheads. This requires that you have a development proxy enrolled in the Beam network. Headlights requires that you organize your Beam keys in a PKI directory that contains one directory per Beam broker. Each broker directory must contain the broker root certificate in `root.crt.pem` and your private key in a file named after the proxy ID with the `.priv.pem` file extension. For example if your name is John your PKI directory may look as follows:

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

`compose.bridgehead.yaml` files define the `proxy1` service that uses the private key from the PKI directory to connect to the Beam network. For example:

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

Many projects have more than one environment. The `compose.local.yaml` and `compose.bridgehead.yaml` files should emulate the production environment. Override files are used to emulate other environments. For example projects with a test environment have a `compose.local.test.yaml` or `compose.bridgehead.test.yaml` override file in their project directory. Use these as follows:

```bash
# Local, test
docker compose -f [PROJECT DIRECTORY]/compose.local.yaml -f [PROJECT DIRECTORY]/compose.local.test.yaml up --pull always
# Bridgehead, test
docker compose -f [PROJECT DIRECTORY]/compose.bridgehead.yaml -f [PROJECT DIRECTORY]/compose.bridgehead.test.yaml --env-file .env.beam up --pull always
```

Override files commonly override image tags and environment variables. For example:

```yaml
services:
  ccp-explorer:
    image: samply/ccp-explorer:develop
    environment:
      PUBLIC_ENVIRONMENT: test
  
  spot:
    image: samply/rustyspot:develop
```

## Running individual components from source

Headlights allows you to exclude a specific component from the Compose file and run it from source. You can get started quickly by copying the three commands for the component you want to run from source from the project README file.

Let's consider an example and look at the three steps in detail. Say we want to start a project in local mode and run Focus from source. The first step is to extract the environment variables of the `focus` service from the Compose file:

```bash
docker compose -f [PROJECT DIRECTORY]/compose.local.yaml config --format json | ./getenv focus
```

This requires that the `compose.local.yaml` file supports running the Focus component from source. All components that Focus connects to must be exposed to a port on the host and Focus must refer to them via `docker.host.internal`. For example:

```yaml
  focus:
    image: samply/focus:main-bbmri
    depends_on:
      - proxy2
    extra_hosts:
      - host.docker.internal:host-gateway
    environment:
      BEAM_PROXY_URL: http://host.docker.internal:8082
      BEAM_APP_ID_LONG: focus.proxy2.broker
      API_KEY: pass123
      ENDPOINT_TYPE: blaze
      BLAZE_URL: http://host.docker.internal:8080/fhir/
      OBFUSCATE: no
```

The `getenv` script replaces `http://docker.host.internal` with `http://localhost` yielding a list of environment variables that can be used to run Focus on the host.

The second step is to run the Compose file excluding the `focus` service:

```
docker compose -f [PROJECT DIRECTORY]/compose.local.yaml up --pull always --scale focus=0
```

As a last step we can run Focus from source with the environment variables we obtained in the first step:

```
API_KEY='pass123' BEAM_APP_ID_LONG='focus.proxy2.broker' BEAM_PROXY_URL='http://localhost:8082' BLAZE_URL='http://localhost:8080/fhir/' ENDPOINT_TYPE='blaze' OBFUSCATE='no' cargo run --features bbmri
```

## Adding a project to Headlights
