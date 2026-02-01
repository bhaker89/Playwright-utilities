import { test, expect } from '@playwright/test';
import { env } from '../../config/environment.config';

test.describe('Mobile Responsive Tests', () => {
  test('should display mobile menu on small screens', async ({ page }) => {
    await page.goto(env.baseURL);
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenuButton).toBeVisible();
  });

  test('should handle different orientations', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(env.baseURL);
    const header = page.locator('header');
    await expect(header).toBeVisible();

    await page.setViewportSize({ width: 667, height: 375 });
    await page.reload();
    await expect(header).toBeVisible();
  });

  test('should have touch-friendly button sizes', async ({ page }) => {
    await page.goto(env.baseURL);
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
