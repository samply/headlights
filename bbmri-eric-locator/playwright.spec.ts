import { test, expect } from '@playwright/test';

test('table contains 256', async ({ page }) => {
  await page.goto('/search');

  await expect(page.getByRole('table')).toContainText('256');
});
