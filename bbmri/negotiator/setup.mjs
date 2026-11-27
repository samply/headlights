import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { sites, scenarios, seedSql, locatorOptions } from './fixtures.mjs';

const destination = process.argv[2];
if (!destination) throw new Error('Usage: node setup.mjs OUTPUT_DIRECTORY');
mkdirSync(destination, { recursive: true });
// A versioned migration runs once per fresh database, after the upstream schema migrations.
writeFileSync(`${destination}/V1000__headlights.sql`, seedSql());
writeFileSync(`${destination}/locator-options.json`, JSON.stringify(locatorOptions()));
const users = JSON.parse(readFileSync(new URL('./oidc/users.json', import.meta.url)));
// Separate identities prevent the GUI's automatic draft merging across scenarios and retries.
// The scenario count comes from fixtures.json, which handoff.spec.ts drives its tests from.
// The browsers must match the projects and the retry count of the `retries` setting in
// playwright.negotiator.config.ts (2 in CI, so retry runs 0-2 must exist).
for (const browser of ['chromium', 'firefox', 'webkit']) {
  for (let scenario = 0; scenario < scenarios.length; scenario++) {
    for (let retry = 0; retry < 3; retry++) {
      const username = `${browser}-${scenario}-${retry}`;
      users.push({ ...users[0], SubjectId: username, Username: username });
    }
  }
}
writeFileSync(`${destination}/users.json`, JSON.stringify(users));
console.log(`Prepared Negotiator fixtures for ${sites.length} sites and ${scenarios.length} scenarios`);
