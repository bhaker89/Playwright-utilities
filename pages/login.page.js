const { BasePage } = require('./base.page');
const { env } = require('../config/environment.config');
const { logger } = require('../utils/logger');

/**
 * Login Page Object Model
 * Demonstrates optimal Locator usage and composition pattern
 */
class LoginPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
    
    /** @protected */
    this.pageUrl = `${env.baseURL}/login`;
    /** @protected */
    this.serviceName = 'authentication-service';

    // Locators using modern Playwright patterns (getByRole, getByTestId, etc.)
    /** @readonly @type {import('@playwright/test').Locator} */
    this.usernameInput = this.getByLabel(/username|email/i);
    /** @readonly @type {import('@playwright/test').Locator} */
    this.passwordInput = this.getByLabel(/password/i);
    /** @readonly @type {import('@playwright/test').Locator} */
    this.loginButton = this.getByRole('button', { name: /log in|sign in/i });
    /** @readonly @type {import('@playwright/test').Locator} */
    this.errorMessage = this.getByTestId('error-message');
    /** @readonly @type {import('@playwright/test').Locator} */
    this.forgotPasswordLink = this.getByRole('link', { name: /forgot password/i });
  }

  /**
   * Perform login action
   * Uses built-in Locator methods instead of page methods
   * @param {string} username
   * @param {string} password
   * @returns {Promise<void>}
   */
  async login(username, password) {
    logger.info(`Logging in as: ${username}`);
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.waitForNavigation();
  }

  /**
   * Fast login without waiting for navigation (for performance)
   * @param {string} username
   * @param {string} password
   * @returns {Promise<void>}
   */
  async fastLogin(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Check if error message is displayed
   * @returns {Promise<string | null>}
   */
  async getErrorMessage() {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Navigate to forgot password page
   * @returns {Promise<void>}
   */
  async navigateToForgotPassword() {
    await this.forgotPasswordLink.click();
  }
}

module.exports = { LoginPage };