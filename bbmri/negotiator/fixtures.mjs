import { readFileSync } from 'node:fs';

export const { sites, scenarios } = JSON.parse(readFileSync(new URL('./fixtures.json', import.meta.url)));

export function fhirBundle(site) {
  const patient = {
    resourceType: 'Patient', id: `${site.id}-patient`, gender: 'female', birthDate: '1980-01-01',
  };
  const specimens = site.specimenCollections.map((specimen, index) => ({
    resourceType: 'Specimen',
    id: `${site.id}-specimen-${index}`,
    subject: { reference: `Patient/${patient.id}` },
    type: { coding: [{ system: 'https://fhir.bbmri.de/CodeSystem/SampleMaterialType', code: specimen.type }] },
    extension: specimen.collection === null ? [] : [{
      url: 'https://fhir.bbmri.de/StructureDefinition/Custodian',
      valueReference: { identifier: { value: site.collections[specimen.collection].id } },
    }],
  }));
  return {
    resourceType: 'Bundle', type: 'transaction',
    entry: [patient, ...specimens].map(resource => ({
      resource, request: { method: 'PUT', url: `${resource.resourceType}/${resource.id}` },
    })),
  };
}

export function locatorOptions() {
  return {
    siteMappings: Object.fromEntries(sites.map(site => [site.id, {
      displayName: site.biobankName, collectionId: site.fallbackCollection,
    }])),
    negotiateOptions: {
      url: 'http://localhost:8090/api/v3/requests',
      // Negotiator 3.23 accepts discovery handoffs without authentication; OIDC follows on redirect.
      authorizationHeader: '',
    },
  };
}

export function directoryCollections(ids) {
  return sites.flatMap(site => site.collections
    .filter(collection => ids.includes(collection.id))
    .map(collection => ({ id: collection.id, biobank: { name: site.biobankName, country: { name: 'DE' } } })));
}

/**
 * The collection IDs Lens is expected to hand over for a scenario: the Custodian
 * collections of the specimens matching the scenario's filter, plus the siteMappings
 * fallback when a site has no matching specimens or any matching specimen without a
 * Custodian. fixtures.test.mjs checks this against each scenario's literal
 * expectedCollectionIds, so a mapping mistake here cannot silently reach the pipeline.
 */
export function expectedHandoffIds(scenario) {
  const ids = [];
  for (const site of sites) {
    if (!scenario.selected.includes(site.id)) continue;
    const matching = site.specimenCollections.filter(
      specimen => scenario.filterSampleType === null || specimen.type === scenario.filterSampleType,
    );
    const custodianIds = [...new Set(matching
      .map(specimen => specimen.collection)
      .filter(collection => collection !== null)
      .map(collection => site.collections[collection].id))];
    const needsFallback =
      matching.length === 0 || matching.some(specimen => specimen.collection === null);
    ids.push(...custodianIds, ...(needsFallback ? [site.fallbackCollection] : []));
  }
  return ids;
}

export function seedSql() {
  // Writes Negotiator's internal schema directly, which couples the seed to its migrations:
  // fixed IDs (discovery_service 10, organizations 10+, resources 100+), and access_form_id 1
  // assumed to exist from the upstream classpath migrations. A Negotiator upgrade that
  // changes this schema breaks Negotiator startup in a way that looks like a fixture bug.
  // Seeding through the admin API after startup would avoid the coupling but needs
  // authentication plumbing the fixture pipeline deliberately does not have.
  const sql = value => `'${value.replaceAll("'", "''")}'`;
  const statements = [
    // Negotiator's discovery-service lookup strips the port from the Locator URL.
    `INSERT INTO discovery_service (id, url, name) VALUES (10, 'http://localhost', 'Headlights Locator');`,
  ];
  sites.forEach((site, index) => {
    const organizationId = 10 + index;
    statements.push(`INSERT INTO organization (id, external_id, name) VALUES (${organizationId}, ${sql(site.biobankId)}, ${sql(site.biobankName)});`);
    site.collections.forEach((collection, collectionIndex) => {
      const resourceId = 100 + index * 10 + collectionIndex;
      statements.push(`INSERT INTO resource (id, name, source_id, discovery_service_id, access_form_id, organization_id)
        VALUES (${resourceId}, ${sql(collection.name)}, ${sql(collection.id)}, 10, 1, ${organizationId});`);
    });
  });
  return statements.join('\n');
}
