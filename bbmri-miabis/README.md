## MIABIS-on-FHIR + BBMRI.de mixed-node Locator

Tests a federated search across two nodes: one running MIABIS-on-FHIR data (focus with `CQL_FLAVOUR=miabis`) and one running BBMRI.de data (focus with default flavour).

```bash
# Local mode (manual UI testing at http://localhost:3000/search/)
docker compose -f bbmri-miabis/compose.local.yaml up --pull always

# Local mode with automated tests
docker compose -f bbmri-miabis/compose.local.yaml up -d
docker compose -f bbmri-miabis/compose.local.yaml wait tester && echo success
```

### What this tests

Eight scenarios across a 2-node federation (MIABIS-on-FHIR node + BBMRI.de node). Counts are totals across both sites.

**Test data summary:**
- MIABIS node (`proxy2`, `CQL_FLAVOUR=miabis`): p1 (female, C34) — Plasma/LN + TissueFixed/RT; p2 (male, C18) — WholeBlood/LN
- BBMRI.de node (`proxy3`, default CQL flavour): bbmri-p1 (female, C50) — blood-plasma/LN; bbmri-p2 (male, C61) — whole-blood/RT

**Mixed-node scenarios (validate totals across both sites):**

| Criterion | MIABIS | BBMRI.de | Total |
|---|---|---|---|
| *(empty AST)* | 2 | 2 | 4 |
| `storage_temperature = temperatureRoom` | 1 (p1, RT specimen) | 1 (bbmri-p2, Room) | 2 |
| `storage_temperature = temperatureLN` | 2 (p1 + p2, LN specimens) | 1 (bbmri-p1, LN) | 3 |
| `sample_kind = blood-plasma` | 1 (p1, Plasma) | 1 (bbmri-p1) | 2 |
| `sample_kind = whole-blood` | 1 (p2, WholeBlood) | 1 (bbmri-p2) | 2 |

**Diagnosis scenarios (validate BBMRI.de node is unaffected by MIABIS workarounds):**

| Criterion | MIABIS | BBMRI.de | Total |
|---|---|---|---|
| `diagnosis = C34` | 1 (p1) | 0 | 1 |
| `diagnosis = C50` | 0 | 1 (bbmri-p1) | 1 |
| `diagnosis = C61` | 0 | 1 (bbmri-p2) | 1 |

### Key design points

**`CQL_FLAVOUR=miabis` (per-site focus config):** Selects the MIABIS-on-FHIR CQL template in focus. Spot continues to send `PROJECT=bbmri` unchanged — only the per-site focus environment variable differs. The BBMRI.de focus instance runs without `CQL_FLAVOUR` and uses the default BBMRI template.

**`CODE_WORKAROUNDS` translation:** Without it, Lens codes (`temperatureRoom`, `blood-plasma`, etc.) do not exist in MIABIS FHIR data and all filter queries silently return 0. The mixed-node temperature and sample_kind scenarios validate that translation works correctly on the MIABIS node while leaving the BBMRI.de node unaffected.

### Test data

`test-bundle.json` — MIABIS-on-FHIR FHIR transaction bundle:
- Patient p1 (female, dx C34): Specimen Plasma/LN, Specimen TissueFixed/RT
- Patient p2 (male, dx C18): Specimen WholeBlood/LN

`test-bundle-bbmri.json` — BBMRI.de FHIR transaction bundle:
- Patient bbmri-p1 (female, dx C50): Specimen blood-plasma/LN
- Patient bbmri-p2 (male, dx C61): Specimen whole-blood/RT

### Troubleshooting

**`--exit-code-from tester` kills the stack immediately (Docker Compose v5):** `--exit-code-from` implies `--abort-on-container-exit`, so `pki-setup` exiting normally after PKI initialisation terminates the entire stack before Blaze becomes healthy. Use `up -d` and run `test.sh` directly instead (see commands above).

**All scenarios return `got=` on second run:** Spot does not re-stream results for a task ID it has already processed. Run `docker compose -f bbmri-miabis/compose.local.yaml down -v` before re-running tests to get a clean stack with fresh task IDs.

**Spot rejects non-UUID query IDs:** IDs must be in `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` hex format. Shorthand forms like `test-0001-0000-...` are silently rejected.

**BBMRI.de filter queries silently return 0:** BBMRI.de focus CQL uses `fhir.bbmri.de` URLs for the StorageTemperature extension and SampleMaterialType CodeSystem. If `test-bundle-bbmri.json` is modified and the wrong namespace (`fhir.bbmri-eric.eu`) is used instead, all filter queries on the BBMRI.de node return 0 with no error.
