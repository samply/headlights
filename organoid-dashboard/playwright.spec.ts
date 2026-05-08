import { test, expect } from '@playwright/test';

test.use({
  baseURL: 'http://localhost:5173',
})

test('public: has title', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('banner')).toContainText('DKTK Organoid Platform');
});

test('public: result summary', async ({ page }) => {
  await page.goto('/');

  // The result summary is only shown after the user has accepted the data protection notice
  await page.getByRole('checkbox', { name: 'Hiermit bestätige ich' }).check();
  await page.getByRole('button', { name: 'Weiter zum Dashboard' }).click();

  await expect(page.getByText("Sites").first()).toContainText('1/');
  await expect(page.getByText("Projects").first()).toContainText('2');
  await expect(page.getByText("Patients").first()).toContainText('2');
  await expect(page.getByText("Organoids").first()).toContainText('5');
});

test('internal', async ({ page }) => {
  await page.goto('/internal/');

  // Check just the first row
  const row = page.getByRole("row").filter({ has: page.getByRole("gridcell", { name: "MetP-P42-t1-M1" }) });
  await expect(row.getByRole("gridcell")).toHaveText(["proxy2", "MetPredict", "MetP-P42", "2024-10-23", "MetP-P42-t1-M1", "T2N2", "Colon ascendens", "C78.7", "Metastasis: resection", "RCTx: Yes (Capecitabin), RTx: No, TNT: Yes (Phantasie)", "CTX: Yes (FOLFOX), Antibodies: Yes (Cetuximab)"])
});