const { logger } = require('../utils/logger');

/**
 * Base Component class for reusable UI components
 * Uses Composition Pattern for building complex UIs
 * Shared across multiple microservices
 * @abstract
 */
class BaseComponent {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {import('@playwright/test').Locator | string} rootLocator
   */
  constructor(page, rootLocator) {
    /** @protected @type {import('@playwright/test').Page} */
    this.page = page;
    /** @protected @type {import('@playwright/test').Locator} */
    this.root = typeof rootLocator === 'string' 
      ? page.locator(rootLocator) 
      : rootLocator;
  }

  /**
   * Get locator relative to component root
   * @protected
   * @param {string} selector
   * @returns {import('@playwright/test').Locator}
   */
  locator(selector) {
    return this.root.locator(selector);
  }

  /**
   * Check if component is visible
   * @returns {Promise<boolean>}
   */
  async isVisible() {
    return await this.root.isVisible();
  }

  /**
   * Wait for component to be visible
   * @param {number} [timeout]
   * @returns {Promise<void>}
   */
  async waitForVisible(timeout) {
    await this.root.waitFor({ state: 'visible', timeout });
  }
}

/**
 * Navigation Component (Common across services)
 */
class NavigationComponent extends BaseComponent {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page, '[data-testid="navigation"]');
  }

  /** @returns {import('@playwright/test').Locator} */
  get homeLink() {
    return this.locator('[data-testid="nav-home"]');
  }

  /** @returns {import('@playwright/test').Locator} */
  get profileLink() {
    return this.locator('[data-testid="nav-profile"]');
  }

  /** @returns {import('@playwright/test').Locator} */
  get settingsLink() {
    return this.locator('[data-testid="nav-settings"]');
  }

  /** @returns {import('@playwright/test').Locator} */
  get logoutButton() {
    return this.locator('[data-testid="nav-logout"]');
  }

  /**
   * @returns {Promise<void>}
   */
  async navigateToHome() {
    logger.info('Navigating to home via navigation');
    await this.homeLink.click();
  }

  /**
   * @returns {Promise<void>}
   */
  async navigateToProfile() {
    logger.info('Navigating to profile via navigation');
    await this.profileLink.click();
  }

  /**
   * @returns {Promise<void>}
   */
  async logout() {
    logger.info('Logging out via navigation');
    await this.logoutButton.click();
  }
}

/**
 * Modal Component (Common across services)
 */
class ModalComponent extends BaseComponent {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {string} [modalSelector='[role="dialog"]']
   */
  constructor(page, modalSelector = '[role="dialog"]') {
    super(page, modalSelector);
  }

  /** @returns {import('@playwright/test').Locator} */
  get title() {
    return this.locator('[data-testid="modal-title"]');
  }

  /** @returns {import('@playwright/test').Locator} */
  get closeButton() {
    return this.locator('[data-testid="modal-close"]');
  }

  /**
   * @returns {Promise<string>}
   */
  async getTitle() {
    return await this.title.textContent() || '';
  }

  /**
   * @returns {Promise<void>}
   */
  async close() {
    await this.closeButton.click();
    await this.root.waitFor({ state: 'hidden' });
  }
}

module.exports = {
  BaseComponent,
  NavigationComponent,
  ModalComponent,
};