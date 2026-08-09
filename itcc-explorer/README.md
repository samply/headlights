## Run ITCC Explorer

```bash
# Local, production
docker compose -f itcc-explorer/compose.local.yaml up --pull always
# Local, test
docker compose -f itcc-explorer/compose.local.yaml -f itcc-explorer/compose.local.test.yaml up --pull always
# Bridgehead, production
docker compose -f itcc-explorer/compose.bridgehead.yaml --env-file .env.beam up --pull always
# Bridgehead, test
docker compose -f itcc-explorer/compose.bridgehead.yaml -f itcc-explorer/compose.bridgehead.test.yaml --env-file .env.beam up --pull always
```

Then open http://localhost:3000/ in your browser.

### Run frontend from source

1.  Determine the environment variables
    ```bash
    # Local, production
    docker compose -f itcc-explorer/compose.local.yaml config --format json | ./getenv itcc-explorer
    # Local, test
    docker compose -f itcc-explorer/compose.local.yaml -f itcc-explorer/compose.local.test.yaml config --format json | ./getenv itcc-explorer
    # Bridgehead, production
    docker compose -f itcc-explorer/compose.bridgehead.yaml --env-file .env.beam config --format json | ./getenv itcc-explorer
    # Bridgehead, test
    docker compose -f itcc-explorer/compose.bridgehead.yaml -f itcc-explorer/compose.bridgehead.test.yaml --env-file .env.beam config --format json | ./getenv itcc-explorer
    ```

2.  Bring up the other services
    ```bash
    # Local, production
    docker compose -f itcc-explorer/compose.local.yaml up --pull always --scale itcc-explorer=0
    # Local, test
    docker compose -f itcc-explorer/compose.local.yaml -f itcc-explorer/compose.local.test.yaml up --pull always --scale itcc-explorer=0
    # Bridgehead, production
    docker compose -f itcc-explorer/compose.bridgehead.yaml --env-file .env.beam up --pull always --scale itcc-explorer=0
    # Bridgehead, test
    docker compose -f itcc-explorer/compose.bridgehead.yaml -f itcc-explorer/compose.bridgehead.test.yaml --env-file .env.beam up --pull always --scale itcc-explorer=0
    ```

3.  Run https://github.com/samply/itcc-explorer from source
    ```bash
    [INSERT ENVIRONMENT VARIABLES] npm run dev -- --port 3000
    ```

### Run Spot from source

1.  Determine the environment variables
    ```bash
    # Local, production
    docker compose -f itcc-explorer/compose.local.yaml config --format json | ./getenv spot
    # Local, test
    docker compose -f itcc-explorer/compose.local.yaml -f itcc-explorer/compose.local.test.yaml config --format json | ./getenv spot
    # Bridgehead, production
    docker compose -f itcc-explorer/compose.bridgehead.yaml --env-file .env.beam config --format json | ./getenv spot
    # Bridgehead, test
    docker compose -f itcc-explorer/compose.bridgehead.yaml -f itcc-explorer/compose.bridgehead.test.yaml --env-file .env.beam config --format json | ./getenv spot
    ```

2.  Bring up the other services
    ```bash
    # Local, production
    docker compose -f itcc-explorer/compose.local.yaml up --pull always --scale spot=0
    # Local, test
    docker compose -f itcc-explorer/compose.local.yaml -f itcc-explorer/compose.local.test.yaml up --pull always --scale spot=0
    # Bridgehead, production
    docker compose -f itcc-explorer/compose.bridgehead.yaml --env-file .env.beam up --pull always --scale spot=0
    # Bridgehead, test
    docker compose -f itcc-explorer/compose.bridgehead.yaml -f itcc-explorer/compose.bridgehead.test.yaml --env-file .env.beam up --pull always --scale spot=0
    ```

3.  Run https://github.com/samply/spot from source
    ```bash
    [INSERT ENVIRONMENT VARIABLES] cargo run
    ```

### Run Focus from source

1.  Determine the environment variables
    ```bash
    # Local, production
    docker compose -f itcc-explorer/compose.local.yaml config --format json | ./getenv focus
    # Local, test
    docker compose -f itcc-explorer/compose.local.yaml -f itcc-explorer/compose.local.test.yaml config --format json | ./getenv focus
    ```

2.  Bring up the other services
    ```bash
    # Local, production
    docker compose -f itcc-explorer/compose.local.yaml up --pull always --scale focus=0
    # Local, test
    docker compose -f itcc-explorer/compose.local.yaml -f itcc-explorer/compose.local.test.yaml up --pull always --scale focus=0
    ```

3.  Run https://github.com/samply/focus from source
    ```bash
    [INSERT ENVIRONMENT VARIABLES] cargo run --features dktk
    ```
