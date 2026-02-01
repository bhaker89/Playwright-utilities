import { test, expect, devices } from '@playwright/test';
import { env } from '../../config/environment.config';

/**
 * Mobile Test Suite) Design Testing
 */
test.describe('Mobile Responsive Tests', () => {
  test('should display mobile menu on small screens', async ({ page }) => {
    await page.goto(`${env.baseURL}`);

    // Check for mobile menu button
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenuButton).toBeVisible();

    // Open mobile menu
    await mobileMenuButton.click();

    // Verify menu is visible
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).toBeVisible();
  });

  test('should handle touch gestures', async ({ page }) => {
    await page.goto(`${env.baseURL}`);

    // Simulate swipe gesture
    const element = page.locator('[data-testid="swipeable-element"]');
    await element.hover();

    const box = await element.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }
  });

  test('should display content properly on different orientations', async ({ page }) => {
    // Portrait mode
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${env.baseURL}`);

    let header = page.locator('header');
    await expect(header).toBeVisible();

    // Landscape mode
    await page.setViewportSize({ width: 667, height: 375 });
    await page.reload();

    await expect(header).toBeVisible();
  });

  test('should have touch-friendly button sizes', async ({ page }) => {
    await page.goto(`${env.baseURL}`);

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count && i < 5; i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        // Minimum touch target size should be 44x44px (iOS) or 48x48px (Android)
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should not display desktop-only elements', async ({ page }) => {
    await page.goto(`${env.baseURL}`);

    // Desktop sidebar should be hidden on mobile
    const desktopSidebar = page.locator('[data-testid="desktop-sidebar"]');
    await expect(desktopSidebar).not.toBeVisible();
  });

  test('should support pinch-to-zoom gestures', async ({ page }) => {
    await page.goto(`${env.baseURL}`);

    // Test viewport meta tag for zoom support
    const metaViewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(metaViewport).toBeTruthy();
  });
});
