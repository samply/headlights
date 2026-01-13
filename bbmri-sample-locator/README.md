## BBMRI-ERIC Locator

```bash
# Local mode
docker compose -f bbmri-sample-locator/compose.local.yaml up --pull always
# Local mode (Test)
docker compose -f bbmri-sample-locator/compose.local.yaml -f bbmri-sample-locator/compose.local.test.yaml up --pull always
# Bridgehead mode
docker compose -f bbmri-sample-locator/compose.bridgehead.yaml --env-file .env.beam up --pull always
# Bridgehead mode (Test)
docker compose -f bbmri-sample-locator/compose.bridgehead.yaml -f bbmri-sample-locator/compose.bridgehead.test.yaml --env-file .env.beam up --pull always
```

Then open http://localhost:3000/search/ in your browser.
