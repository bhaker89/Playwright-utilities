const { test, expect } = require('@playwright/test');

test('smoke: UI base URL loads', async ({ page }) => {
  const uiUrl = process.env.UI_BASE_URL || process.env.BASE_URL;
  await page.goto(uiUrl);

  // Lightweight sanity check: page responded with a non-empty title.
  await expect(page).toHaveTitle(/.+/);
});