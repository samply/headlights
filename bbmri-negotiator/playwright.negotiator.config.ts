import { defineConfig } from '@playwright/test';

// Runs the Negotiator handoff suite against the stack started with
// `./headlights bbmri-negotiator up`, inside the test-handoff service.
export default defineConfig({
  testDir: './negotiator',
  testMatch: 'handoff.spec.ts',
  metadata: { negotiator: true },
  timeout: 120_000,
  expect: { timeout: 30_000 },
  // The Negotiator user has persistent draft state; avoid concurrent browser sessions.
  fullyParallel: false,
  workers: 1,
  // setup.mjs mints one OIDC user per browser, scenario, and retry 0-2.
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium' },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
