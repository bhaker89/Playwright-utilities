const { PlaywrightWrapper } = require('./playwright-wrapper');
const { AssertWrapper } = require('./assert-wrapper');
const { logger } = require('../base/logger');
const { SharedTestContext } = require('../../platform/core/shared-test-context');

// Import your page objects here
const { LoginPage } = require('../../pages/login.page');
// Add more page imports as needed:
// const { HomePage } = require('../pages/home.page');
// const { CheckoutPage } = require('../pages/checkout.page');

/**
 * Bridge Pattern
 * Single entry point for tests to access all pages, wrappers, and helpers.
 * 
 * Inspired by 10xquality but adapted for your framework with:
 * - Self-healing via SmartLocator
 * - storageState-based auth
 * - API client integration
 * 
 * BENEFITS:
 * - No import chaos in tests
 * - Singleton pattern ensures consistency
 * - Easy to extend with new pages
 * - Clean test code
 * 
 * USAGE IN TESTS:
 * ```js
 * test('example', async ({ bridge }) => {
 *   await bridge.loginPage.navigate();
 *   await bridge.loginPage.loginWithOTP('9876543210', '123456');
 *   await bridge.assert.toHaveURL(/\/dashboard/);
 * });
 * ```
 * 
 * TO ADD NEW PAGES:
 * 1. Import the page class at top
 * 2. Add property in constructor: this.yourPage = YourPage.getInstance(page);
 */
class Bridge {
  /** @private */
  static instance = null;
  /** @private */
  static currentPage = null;

  /**
   * @private
   * @param {import('@playwright/test').Page} page 
   * @param {import('../utils/api/api-client').APIClient} [apiClient]
   */
  constructor(page, apiClient = null) {
    /** @type {import('@playwright/test').Page} */
    this.page = page;

    // Core wrappers
    /** @type {PlaywrightWrapper} */
    this.wrapper = PlaywrightWrapper.getInstance(page);
    
    /** @type {AssertWrapper} */
    this.assert = new AssertWrapper(page);
    
    /** @type {SharedTestContext} */
    this.context = SharedTestContext.getInstance();

    // API Client (for integrated UI + API tests)
    /** @type {import('../utils/api/api-client').APIClient | null} */
    this.apiClient = apiClient;

    // ========================================
    // PAGE OBJECTS REGISTRY
    // Add new page objects here as you create them
    // ========================================
    
    /** @type {LoginPage} */
    this.loginPage = LoginPage.getInstance(page);

    // Example: Add more pages
    // this.homePage = HomePage.getInstance(page);
    // this.checkoutPage = CheckoutPage.getInstance(page);
    // this.profilePage = ProfilePage.getInstance(page);

    logger.debug('[Bridge] Instance created with all pages registered');
  }

  /**
   * Get Bridge singleton instance
   * @param {import('@playwright/test').Page} page 
   * @param {import('../utils/api/api-client').APIClient} [apiClient]
   * @returns {Bridge}
   */
  static getInstance(page, apiClient = null) {
    if (!Bridge.instance || Bridge.currentPage !== page) {
      Bridge.instance = new Bridge(page, apiClient);
      Bridge.currentPage = page;
    }
    // Update API client if provided (for hybrid tests)
    if (apiClient) {
      Bridge.instance.apiClient = apiClient;
    }
    return Bridge.instance;
  }

  /**
   * Quick navigation helper
   * @param {string} url 
   * @returns {Promise<void>}
   */
  async goto(url) {
    await this.wrapper.goto(url);
  }

  /**
   * Get current URL
   * @returns {string}
   */
  getCurrentURL() {
    return this.wrapper.getURL();
  }

  /**
   * Take screenshot
   * @param {string} name 
   * @returns {Promise<Buffer>}
   */
  async screenshot(name) {
    return await this.wrapper.screenshot(name);
  }

  /**
   * Reload page
   * @returns {Promise<void>}
   */
  async reload() {
    await this.wrapper.reload();
  }

  /**
   * Go back
   * @returns {Promise<void>}
   */
  async goBack() {
    await this.wrapper.goBack();
  }
}

module.exports = { Bridge };