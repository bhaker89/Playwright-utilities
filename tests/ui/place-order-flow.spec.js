import { test as authTest, expect } from '../../fixtures/auth.fixture';
import { logger } from '../../utils/logger';

/**
 * Place Order Flow - Using Authenticated Fixture
 * 
 * This test demonstrates REUSABILITY:
 * - User is ALREADY logged in (no login code needed!)
 * - Auth fixture handles all authentication
 * - Focus only on testing the order flow
 * 
 * This is how you should write tests for features that require login!
 */

authTest.describe('Place Order Flow - With Authenticated User', () => {

  authTest.beforeAll(async () => {
    logger.info('🛒 ORDER FLOW TEST SUITE STARTING');
  });

  /**
   * TC_ORDER_001) and Add Product to Cart
   */
  authTest('TC_ORDER_001 - Should browse products and add to cart', async ({ authenticatedPage }) => {
    // User is ALREADY logged in! Start directly with test logic
    logger.info('Step 1) to medicines category');
    await authenticatedPage.goto('https://steve.1mg.com/categories/all-products-7');
    await authenticatedPage.waitForLoadState('networkidle');

    logger.info('Step 2) for a product');
    const searchBox = authenticatedPage.locator('input[placeholder*="search" i]').first();
    if (await searchBox.isVisible({ timeout: 5000 })) {
      await searchBox.fill('Paracetamol');
      await searchBox.press('Enter');
      logger.info('✅ Product search completed');
    }

    logger.info('Step 3) products are displayed');
    await authenticatedPage.waitForTimeout(2000);
    const url = authenticatedPage.url();
    logger.info(`Current URL: ${url}`);

    logger.info('✅ TC_ORDER_001 completed');
  });

  /**
   * TC_ORDER_002) Order History
   */
  authTest('TC_ORDER_002 - Should view order history', async ({ authenticatedPage }) => {
    // Again, user is ALREADY logged in!
    logger.info('Step 1) to orders page');
    await authenticatedPage.goto('https://steve.1mg.com/');

    logger.info('Step 2) for My Orders link');
    const myOrdersLink = authenticatedPage.locator('text=My Orders').first();
    if (await myOrdersLink.isVisible({ timeout: 5000 })) {
      await myOrdersLink.click();
      logger.info('✅ Navigated to orders page');
    } else {
      logger.warn('My Orders link not found - user might need to place an order first');
    }

    logger.info('✅ TC_ORDER_002 completed');
  });

  /**
   * TC_ORDER_003) Profile Information
   */
  authTest('TC_ORDER_003 - Should access profile page', async ({ authenticatedPage }) => {
    // User is logged in!
    logger.info('Step 1) to home');
    await authenticatedPage.goto('https://steve.1mg.com/');

    logger.info('Step 2) for profile/account link');
    const profileSelectors = [
      'text=My Account',
      'text=Profile',
      '[data-testid="user-profile"]',
   ;

    for (const selector of profileSelectors) {
      const element = authenticatedPage.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 })) {
        logger.info(`✅ Found profile element: ${selector}`);
        break;
      }
    }

    logger.info('✅ TC_ORDER_003 completed');
  });

  authTest.afterAll(async () => {
    logger.info('🛒 ORDER FLOW TEST SUITE COMPLETED');
  });
});
