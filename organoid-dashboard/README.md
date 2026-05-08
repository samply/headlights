## Organoid Dashboard

```bash
# Local mode
docker compose -f organoid-dashboard/compose.local.yaml up --pull always
# Bridgehead mode
docker compose -f organoid-dashboard/compose.bridgehead.yaml up --pull always
```

Then open http://localhost:5173/ and http://localhost:5173/internal/ in your browser.

### Testing SQL queries

SQL queries can be tested in local mode. Either run Focus from source or execute the query directly against the database:

```bash
psql postgresql://postgres:mypassword@localhost/postgres -f resources/sql/ORGANOID_DASHBOARD_PUBLIC
```
