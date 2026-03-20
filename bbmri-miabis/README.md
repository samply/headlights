## MIABIS-on-FHIR Locator

```bash
# Local mode
docker compose -f bbmri-miabis/compose.local.yaml up --pull always

# Local mode (Test)
docker compose -f bbmri-miabis/compose.local.yaml up --pull always --exit-code-from tester
```

Then open http://localhost:3000/search/ in your browser for manual testing.

### What this tests

Five scenarios against a 2-patient, 3-specimen MIABIS-on-FHIR dataset:

| Criterion | Expected patients |
|---|---|
| *(empty)* | 2 |
| `storage_temperature = temperatureRoom` | 1 (specimen with RT storage, patient p1) |
| `storage_temperature = temperatureLN` | 2 (specimens with LN storage, patients p1 + p2) |
| `sample_kind = blood-plasma` | 1 (Plasma specimen, patient p1) |
| `sample_kind = whole-blood` | 1 (WholeBlood specimen, patient p2) |

Scenarios 2–5 validate the `CODE_WORKAROUNDS` translation in focus: without it,
the Lens codes (`temperatureRoom`, `blood-plasma`, etc.) do not exist in MIABIS
FHIR data and all queries silently return 0.

### Key difference from `bbmri-sample-locator`

Focus is started with `CQL_FLAVOUR=miabis`, which selects the MIABIS-on-FHIR
CQL template instead of the default BBMRI one. Spot continues to send
`PROJECT=bbmri` (unchanged); only the per-site focus config differs.

### Test data

`test-bundle.json` contains:
- Patient p1 (female, dx C34): Specimen Plasma/LN, Specimen TissueFixed/RT
- Patient p2 (male, dx C18): Specimen WholeBlood/LN
