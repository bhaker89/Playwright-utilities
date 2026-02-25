const { logger } = require('../utils/base/logger');
const { takeScreenshot } = require('../utils/ui/ui-actions');

/**
 * Base Page Object Model class
 * Uses composition over inheritance and optimal Locator patterns
 * Optimized for scalability across multiple microservices
 * 
 * DESIGN PRINCIPLE: Keep BasePage THIN
 * - Only core page navigation and locator methods
 * - For advanced UI actions (popup, upload, download, toast, etc.) use utils/ui/ui-actions.js
 * - For network actions (mocking, response capture) use utils/network/network-actions.js
 * 
 * @abstract
 */
class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    /** @protected @type {import('@playwright/test').Page} */
    this.page = page;
    /** @protected @type {string} */
    this.pageUrl = '';
    /** @protected @type {string | undefined} */
    this.serviceName = undefined;
  }

  /**
   * Navigate to the page with automatic wait
   * @param {boolean} [waitForLoad=true]
   * @returns {Promise<void>}
   */
  async navigate(waitForLoad = true) {
    logger.info(`Navigating to: ${this.pageUrl}`);
    await this.page.goto(this.pageUrl);
    if (waitForLoad) {
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Get locator - primary method for element interaction
   * Uses Playwright's native Locator API which has built-in auto-waiting
   * @protected
   * @param {string} selector
   * @returns {import('@playwright/test').Locator}
   */
  locator(selector) {
    return this.page.locator(selector);
  }

  /**
   * Get locator by role (accessibility-first approach)
   * @protected
   * @param {Parameters<import('@playwright/test').Page['getByRole']>[0]} role
   * @param {Parameters<import('@playwright/test').Page['getByRole']>[1]} [options]
   * @returns {import('@playwright/test').Locator}
   */
  getByRole(role, options) {
    return this.page.getByRole(role, options);
  }

  /**
   * Get locator by test ID (recommended for testing)
   * @protected
   * @param {string} testId
   * @returns {import('@playwright/test').Locator}
   */
  getByTestId(testId) {
    return this.page.getByTestId(testId);
  }

  /**
   * Get locator by text
   * @protected
   * @param {string | RegExp} text
   * @param {{ exact?: boolean }} [options]
   * @returns {import('@playwright/test').Locator}
   */
  getByText(text, options) {
    return this.page.getByText(text, options);
  }

  /**
   * Get locator by label
   * @protected
   * @param {string | RegExp} label
   * @param {{ exact?: boolean }} [options]
   * @returns {import('@playwright/test').Locator}
   */
  getByLabel(label, options) {
    return this.page.getByLabel(label, options);
  }

  /**
   * Get locator by placeholder
   * @protected
   * @param {string | RegExp} placeholder
   * @param {{ exact?: boolean }} [options]
   * @returns {import('@playwright/test').Locator}
   */
  getByPlaceholder(placeholder, options) {
    return this.page.getByPlaceholder(placeholder, options);
  }

  /**
   * Wait for specific locator to be visible
   * @param {import('@playwright/test').Locator} locator
   * @param {'visible' | 'hidden' | 'attached' | 'detached'} [state='visible']
   * @param {number} [timeout]
   * @returns {Promise<void>}
   */
  async waitForLocator(locator, state = 'visible', timeout) {
    await locator.waitFor({ state, timeout });
  }

  /**
   * Get page title
   * @returns {Promise<string>}
   */
  async getTitle() {
    return await this.page.title();
  }

  /**
   * Get current URL
   * @returns {Promise<string>}
   */
  async getCurrentUrl() {
    return this.page.url();
  }

  /**
   * Take screenshot
   * @param {string} name
   * @param {boolean} [fullPage=false]
   * @returns {Promise<Buffer>}
   */
  async screenshot(name, fullPage = false) {
    return await takeScreenshot(this.page, name, fullPage);
  }

  /**
   * Wait for navigation to complete
   * @param {{ timeout?: number; url?: string | RegExp }} [options]
   * @returns {Promise<void>}
   */
  async waitForNavigation(options) {
    await this.page.waitForLoadState('networkidle', { timeout: options?.timeout });
    if (options?.url) {
      await this.page.waitForURL(options.url, { timeout: options.timeout });
    }
  }

  /**
   * Reload page
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async reload(options) {
    logger.info('Reloading page');
    await this.page.reload(options);
  }

  /**
   * Go back
   * @returns {Promise<void>}
   */
  async goBack() {
    logger.info('Navigating back');
    await this.page.goBack();
  }
}

module.exports = { BasePage };