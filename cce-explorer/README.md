## Run CCE Explorer

```bash
# Local, production
docker compose -f cce-explorer/compose.local.yaml up --pull always
# Local, test
docker compose -f cce-explorer/compose.local.yaml -f cce-explorer/compose.local.test.yaml up --pull always
# Bridgehead, production
docker compose -f cce-explorer/compose.bridgehead.yaml --env-file .env.beam up --pull always
# Bridgehead, test
docker compose -f cce-explorer/compose.bridgehead.yaml -f cce-explorer/compose.bridgehead.test.yaml --env-file .env.beam up --pull always
```

Then open http://localhost:3000/ in your browser.

### Run frontend from source

1.  Determine the environment variables
    ```bash
    # Local, production
    docker compose -f cce-explorer/compose.local.yaml config --format json | ./getenv cce-explorer
    # Local, test
    docker compose -f cce-explorer/compose.local.yaml -f cce-explorer/compose.local.test.yaml config --format json | ./getenv cce-explorer
    # Bridgehead, production
    docker compose -f cce-explorer/compose.bridgehead.yaml --env-file .env.beam config --format json | ./getenv cce-explorer
    # Bridgehead, test
    docker compose -f cce-explorer/compose.bridgehead.yaml -f cce-explorer/compose.bridgehead.test.yaml --env-file .env.beam config --format json | ./getenv cce-explorer
    ```

2.  Bring up the other services
    ```bash
    # Local, production
    docker compose -f cce-explorer/compose.local.yaml up --pull always --scale cce-explorer=0
    # Local, test
    docker compose -f cce-explorer/compose.local.yaml -f cce-explorer/compose.local.test.yaml up --pull always --scale cce-explorer=0
    # Bridgehead, production
    docker compose -f cce-explorer/compose.bridgehead.yaml --env-file .env.beam up --pull always --scale cce-explorer=0
    # Bridgehead, test
    docker compose -f cce-explorer/compose.bridgehead.yaml -f cce-explorer/compose.bridgehead.test.yaml --env-file .env.beam up --pull always --scale cce-explorer=0
    ```

3.  Run https://github.com/samply/cce-explorer from source
    ```bash
    [INSERT ENVIRONMENT VARIABLES] npm run dev -- --port 3000
    ```

#### Frontend env vars

Right now, the only env var printed out is the PUBLIC_SPOT_URL, but this is already specified in the `cce-explorer/config/options.json` so we can run the frontend normally (without having to specify the env vars with the `npm run` cmd).

### Run Spot from source

1.  Determine the environment variables
    ```bash
    # Local, production
    docker compose -f cce-explorer/compose.local.yaml config --format json | ./getenv spot
    # Local, test
    docker compose -f cce-explorer/compose.local.yaml -f cce-explorer/compose.local.test.yaml config --format json | ./getenv spot
    # Bridgehead, production
    docker compose -f cce-explorer/compose.bridgehead.yaml --env-file .env.beam config --format json | ./getenv spot
    # Bridgehead, test
    docker compose -f cce-explorer/compose.bridgehead.yaml -f cce-explorer/compose.bridgehead.test.yaml --env-file .env.beam config --format json | ./getenv spot
    ```

2.  Bring up the other services
    ```bash
    # Local, production
    docker compose -f cce-explorer/compose.local.yaml up --pull always --scale spot=0
    # Local, test
    docker compose -f cce-explorer/compose.local.yaml -f cce-explorer/compose.local.test.yaml up --pull always --scale spot=0
    # Bridgehead, production
    docker compose -f cce-explorer/compose.bridgehead.yaml --env-file .env.beam up --pull always --scale spot=0
    # Bridgehead, test
    docker compose -f cce-explorer/compose.bridgehead.yaml -f cce-explorer/compose.bridgehead.test.yaml --env-file .env.beam up --pull always --scale spot=0
    ```

3.  Run https://github.com/samply/spot from source
    ```bash
    [INSERT ENVIRONMENT VARIABLES] cargo run
    ```

### Run Focus from source

1.  Determine the environment variables
    ```bash
    # Local, production
    docker compose -f cce-explorer/compose.local.yaml config --format json | ./getenv focus
    # Local, test
    docker compose -f cce-explorer/compose.local.yaml -f cce-explorer/compose.local.test.yaml config --format json | ./getenv focus
    ```

2.  Bring up the other services
    ```bash
    # Local, production
    docker compose -f cce-explorer/compose.local.yaml up --pull always --scale focus=0
    # Local, test
    docker compose -f cce-explorer/compose.local.yaml -f cce-explorer/compose.local.test.yaml up --pull always --scale focus=0
    ```

3.  Run https://github.com/samply/focus from source
    ```bash
    [INSERT ENVIRONMENT VARIABLES] cargo run --features cce
    ```

#### Focus env vars

```bash
API_KEY='pass123' BEAM_APP_ID_LONG='focus.proxy2.broker' BEAM_PROXY_URL='http://localhost:4002' BLAZE_URL='http://localhost:8080/fhir/' ENDPOINT_TYPE='blaze' OBFUSCATE='no'
```
