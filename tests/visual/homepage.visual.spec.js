import { test, expect } from '@playwright/test';
import { env } from '../../config/environment.config';

/**
 * Visual Regression Test Suite)
 */
test.describe('Homepage Visual Tests', () => {

  test('should match homepage screenshot', async ({ page }) => {
    await page.goto(`${env.baseURL}`);
    await page.waitForLoadState('networkidle');

    // Full page screenshot comparison
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match header screenshot', async ({ page }) => {
    await page.goto(`${env.baseURL}`);

    const header = page.locator('header');
    await expect(header).toHaveScreenshot('header.png', {
      maxDiffPixels: 50,
    });
  });

  test('should match footer screenshot', async ({ page }) => {
    await page.goto(`${env.baseURL}`);

    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer.png', {
      maxDiffPixels: 50,
    });
  });

  test('should match hero section on different viewports', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
   ;

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${env.baseURL}`);

      const heroSection = page.locator('[data-testid="hero-section"]');
      await expect(heroSection).toHaveScreenshot(`hero-${viewport.name}.png`, {
        maxDiffPixels: 100,
      });
    }
  });

  test('should match button states', async ({ page }) => {
    await page.goto(`${env.baseURL}`);

    const button = page.locator('[data-testid="primary-button"]');

    // Normal state
    await expect(button).toHaveScreenshot('button-normal.png');

    // Hover state
    await button.hover();
    await expect(button).toHaveScreenshot('button-hover.png');
  });
});
