import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  sites, scenarios, fhirBundle, locatorOptions, directoryCollections, expectedHandoffIds,
} from './fixtures.mjs';

test('search Custodians and Locator fallbacks resolve to the seeded biobanks', () => {
  const options = locatorOptions();
  for (const site of sites) {
    const bundle = fhirBundle(site);
    const patientIds = bundle.entry.filter(({ resource }) => resource.resourceType === 'Patient')
      .map(({ resource }) => `Patient/${resource.id}`);
    const collectionIds = new Set(site.collections.map(collection => collection.id));
    const specimens = bundle.entry.filter(({ resource }) => resource.resourceType === 'Specimen');
    assert.equal(specimens.length, site.specimenCollections.length);
    for (const { resource } of specimens) {
      assert.ok(patientIds.includes(resource.subject.reference));
      const custodian = resource.extension.find(extension => extension.url.endsWith('/Custodian'));
      const collectionId = custodian?.valueReference.identifier.value ?? options.siteMappings[site.id].collectionId;
      assert.ok(collectionIds.has(collectionId));
      assert.equal(collectionId.split(':collection:')[0], site.biobankId);
    }
    const names = directoryCollections([...collectionIds]);
    assert.equal(names.length, collectionIds.size);
    assert.ok(names.every(collection => collection.biobank.name === site.biobankName));
  }
  assert.deepEqual(directoryCollections(['unknown']), []);
});

test('fallbacks are unreferenced, references resolve, IDs match the Directory format', () => {
  // Lens only sends IDs matching this pattern to the Negotiator; a fixture ID
  // outside it would silently drop out of the handoff payload.
  const directoryIdPattern = /^bbmri-eric:ID:[A-Z]{2}_[A-Za-z0-9_-]+:collection:[A-Za-z0-9_-]+$/;
  for (const site of sites) {
    assert.ok(site.collections.some(collection => collection.id === site.fallbackCollection));
    assert.ok(directoryIdPattern.test(site.fallbackCollection));
    const custodianIds = new Set();
    for (const specimen of site.specimenCollections) {
      if (specimen.collection === null) continue;
      assert.ok(specimen.collection < site.collections.length);
      custodianIds.add(site.collections[specimen.collection].id);
    }
    // A fallback that a real Custodian also references would hide which code
    // path produced a handed-over ID.
    assert.ok(!custodianIds.has(site.fallbackCollection));
  }
});

test('each scenario computes exactly its literal expected collection IDs', () => {
  for (const scenario of scenarios) {
    assert.deepEqual(
      [...expectedHandoffIds(scenario)].sort(),
      [...scenario.expectedCollectionIds].sort(),
      `scenario '${scenario.name}'`,
    );
    // handoff.spec.ts builds the ?query= filter from these two fields together.
    if (scenario.filterSampleType !== null) {
      assert.ok(scenario.filterLabel, `scenario '${scenario.name}' filters by sample type without a label`);
    }
  }
});

test('write-bundles writes each site\'s bundle and rejects unknown sites', async () => {
  for (const site of sites) {
    const destination = mkdtempSync(join(tmpdir(), 'headlights-fixtures-'));
    try {
      const child = spawn(process.execPath,
        [fileURLToPath(new URL('./write-bundles.mjs', import.meta.url)), site.id, destination],
        { stdio: 'ignore' });
      const [code] = await once(child, 'exit');
      assert.equal(code, 0);
      const written = JSON.parse(readFileSync(join(destination, `${site.id}.json`), 'utf8'));
      assert.deepEqual(written, fhirBundle(site));
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  }
  const destination = mkdtempSync(join(tmpdir(), 'headlights-fixtures-'));
  try {
    const child = spawn(process.execPath,
      [fileURLToPath(new URL('./write-bundles.mjs', import.meta.url)), 'unknown-site', destination],
      { stdio: 'ignore' });
    const [code] = await once(child, 'exit');
    assert.notEqual(code, 0);
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
});
