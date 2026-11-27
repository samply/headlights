import { test, expect } from '@playwright/test';
import fixtures from './fixtures.json';

interface SpecimenFixture { collection: number | null; type: string; }

interface SiteFixture {
  id: string;
  biobankId: string;
  biobankName: string;
  collections: { id: string; name: string }[];
  fallbackCollection: string;
  specimenCollections: SpecimenFixture[];
}

interface ScenarioFixture {
  name: string;
  selected: string[];
  deselected: string[];
  filterSampleType: string | null;
  /** Display label for `filterSampleType`, required whenever the filter is set. */
  filterLabel?: string;
  /** The collection IDs the handoff must carry; fixtures.test.mjs validates them against the fixture data. */
  expectedCollectionIds: string[];
}

const { sites, scenarios } = fixtures as { sites: SiteFixture[]; scenarios: ScenarioFixture[] };
const negotiatorOrigin = 'http://localhost:8090';
const requestEndpoint = `${negotiatorOrigin}/api/v3/requests`;

/** Specimens per site matching the scenario's filter, as the results table should show them. */
function expectedSpecimenCount(site: SiteFixture, scenario: ScenarioFixture): number {
  return site.specimenCollections.filter(
    specimen => scenario.filterSampleType === null || specimen.type === scenario.filterSampleType,
  ).length;
}

/** Lens query for a sample-type filter, shaped like the query builder's output. */
function sampleTypeQuery(scenario: ScenarioFixture) {
  if (scenario.filterSampleType === null) return undefined;
  // The `id`/`queryBindId` values are arbitrary per-criterion identifiers shaped after the
  // query builder's output; the ?query= URL format itself is a Lens internal, not a contract.
  return [[{
    id: '29d9c87f-7a81-4bdb-aa1b-3f5a272dfd86', key: 'sample_kind', name: 'Sample type', type: 'EQUALS',
    values: [{
      name: scenario.filterLabel ?? scenario.filterSampleType,
      value: scenario.filterSampleType, queryBindId: '75c04077-0312-4fd2-a74f-bf3766f7459c',
    }],
  }]];
}

for (const [scenarioIndex, scenario] of scenarios.entries()) {
  test(scenario.name, async ({ page }, testInfo) => {
    // This flag is only readable while a test runs, so the skip cannot sit at
    // the top of the file. Under the plain playwright.config.ts it skips the
    // whole suite instead of failing, since that config has no metadata.
    test.skip(!testInfo.config.metadata.negotiator,
      'Requires the bbmri stack with negotiator.yaml and playwright.negotiator.config.ts');

    // setup.mjs mints one OIDC user per project × scenario × retry (retries 0-2). An
    // unexpected project name or retry index would otherwise surface as a confusing OIDC
    // login error instead of this message.
    if (!['chromium', 'firefox', 'webkit'].includes(testInfo.project.name) || testInfo.retry > 2) {
      throw new Error(
        `No OIDC user is seeded for '${testInfo.project.name}', scenario ${scenarioIndex}, ` +
        `retry ${testInfo.retry}; update negotiator/setup.mjs`);
    }

    // Safety net against the stale-base-image hazard: an old Locator silently falls back to
    // options-test.json's negotiateOptions, which would file the handoff on the acceptance
    // Negotiator with a committed credential. Nothing outside localhost may be contacted.
    await page.context().route(/^https?:\/\/(?!localhost[:/])/, route => route.abort());

    const expected = scenario.expectedCollectionIds.flatMap(id => sites.flatMap(site => site.collections
      .filter(collection => collection.id === id)
      .map(collection => ({
        id, name: collection.name, organizationId: site.biobankId, organizationName: site.biobankName,
      }))));

    const query = sampleTypeQuery(scenario);
    await page.goto(query === undefined ? '/search' : `/search?query=${encodeURIComponent(JSON.stringify(query))}`);
    const table = page.getByRole('table');
    // Wait for both real Focus responses, including the unselected site.
    for (const site of sites) {
      const row = table.getByRole('row').filter({ hasText: site.biobankName });
      await expect(row).toHaveCount(1);
      await expect(row.getByRole('cell').last()).toHaveText(String(expectedSpecimenCount(site, scenario)));
      const checkbox = row.getByRole('checkbox');
      if (scenario.deselected.includes(site.id)) {
        // Check first so that unchecking is a real toggle rather than a no-op.
        await checkbox.check();
        await checkbox.uncheck();
      } else {
        await checkbox.setChecked(scenario.selected.includes(site.id));
      }
    }
    // The bbmri stack's other sites (bbmri, miabis, generated) are in the table too. Lens
    // starts with every row unchecked, so they stay out of the handoff; the Negotiator knows
    // none of their collections. Fail here, not on the payload, should that default change.
    await expect(table.getByRole('row').filter({ has: page.getByRole('checkbox', { checked: true }) }),
      'only the selected Headlights biobanks may be checked').toHaveCount(scenario.selected.length);

    // Negotiator only lands on /edit/requests/<id> if it turns the request into a draft. Two API
    // calls decide that, and both fail silently in the UI, so a stall is otherwise impossible to
    // diagnose: record them and any client-side error to explain a bad final URL.
    const draftTrail: string[] = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/access-form') || /\/negotiations(\?|$)/.test(url)) {
        draftTrail.push(`${response.request().method()} ${response.status()} ${url}`);
      }
    });
    page.on('pageerror', error => draftTrail.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') draftTrail.push(`console.error: ${message.text()}`);
    });

    // The handoff is observed, not intercepted: Lens navigates away the moment it has read the
    // handoff response, tearing the response body out from under any test-side read (on Firefox
    // the read never settles at all). Payload and status come from the request and the response
    // metadata, which the navigation cannot affect; the redirect target is asserted more
    // strongly by the URL the browser actually lands on.
    const handoffTimeout = 30_000;
    const [handoffRequest, handoffResponse] = await Promise.all([
      page.waitForRequest(
        request => request.url() === requestEndpoint && request.method() === 'POST',
        { timeout: handoffTimeout }),
      page.waitForResponse(
        response => response.url() === requestEndpoint && response.request().method() === 'POST',
        { timeout: handoffTimeout }),
      page.getByRole('button', { name: 'Negotiate with biobanks', exact: true }).click(),
    ]).catch((error: unknown) => {
      // A handoff that never arrives usually means the POST went to a non-localhost Negotiator
      // and was aborted by the guard above: the base Locator image is stale.
      throw new Error(
        `handoff POST still pending after ${handoffTimeout}ms ` +
          `(${error instanceof Error ? error.message : String(error)}); ` +
          'an aborted non-localhost handoff means the base Locator image is stale',
        { cause: error });
    });
    const payload = handoffRequest.postDataJSON();

    await testInfo.attach('locator-handoff.json', {
      body: JSON.stringify(payload, null, 2), contentType: 'application/json',
    });
    expect(handoffResponse.status()).toBe(201);
    expect(payload.url).toBe('http://localhost:3000');
    // The Negotiator stores the query with the request, so the handoff must carry it.
    if (scenario.filterSampleType !== null) {
      expect(payload.humanReadable).toContain(`sample_kind EQUALS ${scenario.filterSampleType}`);
    }
    expect(payload.resources.map((resource: any) => ({ id: resource.id, organizationId: resource.organization.externalId }))
      .sort((a: any, b: any) => a.id.localeCompare(b.id))).toEqual(expected.map(({ id, organizationId }) => ({ id, organizationId }))
      .sort((a, b) => a.id.localeCompare(b.id)));

    // Follow the application's redirect and authenticate through the real local OIDC flow.
    await expect(page).toHaveURL(/^http:\/\/localhost:4011\//);
    await page.getByLabel('Username', { exact: true }).fill(`${testInfo.project.name}-${scenarioIndex}-${testInfo.retry}`);
    await page.getByLabel('Password', { exact: true }).fill('researcher');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    // Negotiator turns the handed-over request into a draft and navigates to its summary.
    try {
      await expect(page).toHaveURL(/^http:\/\/localhost:8090\/edit\/requests\/[^/?]+(?:\?step=0)?$/);
    } catch (error) {
      const notice = await page.locator('.analytics-notice, .toast, .notification').allInnerTexts().catch(() => []);
      await testInfo.attach('draft-conversion-diagnosis.txt', {
        body: [`landed on ${page.url()}`, ...draftTrail, `visible notices: ${JSON.stringify(notice)}`].join('\n'),
        contentType: 'text/plain',
      });
      throw error;
    }
    await page.locator('.analytics-notice').getByRole('button', { name: 'Close', exact: true }).click();

    // Assert the rendered resource set, not merely the HTTP handoff. Names are unique fixture labels.
    const resources = page.locator('.resources-list-item');
    await expect(async () => {
      const rendered = await resources.evaluateAll(items => items.map(item => ({
        name: item.querySelector('.item-name')?.textContent?.trim(),
        organizationName: item.querySelector('.item-org-tag')?.textContent?.trim(),
      })).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')));
      expect(rendered).toEqual(expected.map(({ name, organizationName }) => ({ name, organizationName }))
        .sort((a, b) => a.name.localeCompare(b.name)));
    }).toPass();
    // evaluateAll also finds display:none items, so visibility is checked per item.
    for (const resource of expected) {
      await expect(resources.filter({ has: page.locator('.item-name').getByText(resource.name, { exact: true }) })).toBeVisible();
    }
    await testInfo.attach('negotiator-selection.png', {
      body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
    });
    // Not `exact`: the icon glyph is part of these buttons' accessible names ("\uF1F8 Delete
    // Draft"), so an exact match never resolves and the click burns the rest of the test budget.
    await page.getByRole('button', { name: 'Delete Draft' }).click();
    await page.locator('#deleteDraftModal').getByRole('button', { name: 'Confirm' }).click();
    await expect(page).toHaveURL(`${negotiatorOrigin}/researcher`);
  });
}
