## CCP Explorer

```bash
# Local mode
docker compose -f ccp-explorer/compose.local.yaml up --pull always
# Local mode (Test)
docker compose -f ccp-explorer/compose.local.yaml -f ccp-explorer/compose.local.test.yaml up --pull always
# Bridgehead mode
docker compose -f ccp-explorer/compose.bridgehead.yaml --env-file .env.beam up --pull always
# Bridgehead mode (Test)
docker compose -f ccp-explorer/compose.bridgehead.yaml -f ccp-explorer/compose.bridgehead.test.yaml --env-file .env.beam up --pull always
```

Then open http://localhost:3000/ in your browser.
