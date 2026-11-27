import { mkdirSync, writeFileSync } from 'node:fs';
import { fhirBundle, sites } from './fixtures.mjs';

// Writes one site's FHIR fixture bundle into a directory, which
// lib/testdata/load.sh then uploads to that site's Blaze:
//   node write-bundles.mjs <site ID> <destination directory>
const [siteId, destination] = process.argv.slice(2);
const site = sites.find(site => site.id === siteId);
if (!site || !destination) {
  throw new Error(
    `Usage: node write-bundles.mjs <site ID> <destination directory>; ` +
    `fixtures.json lists: ${sites.map(site => site.id).join(', ')}`);
}
mkdirSync(destination, { recursive: true });
writeFileSync(`${destination}/${siteId}.json`, JSON.stringify(fhirBundle(site)));
console.log(`Wrote the FHIR fixture bundle for ${siteId}`);
