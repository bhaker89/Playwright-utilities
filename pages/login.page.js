const { BasePage } = require('./base.page');
const { env } = require('../config/environment.config');
const { logger } = require('../utils/base/logger');

/**
 * Login Page Object Model
 * NOW WITH: Singleton pattern + PlaywrightWrapper + SmartLocator healing
 * 
 * USAGE:
 * ```js
 * const loginPage = LoginPage.getInstance(page);
 * await loginPage.navigate();
 * await loginPage.loginWithOTP('9876543210', '123456');
 * ```
 */
class LoginPage extends BasePage {
  /** @private */
  static _instance = null;
  /** @private */
  static _currentPage = null;

  /**
   * @private
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    /** @protected */
    this.pageUrl = `${env.uiBaseURL}/?login=true&followup=/login`;
    /** @protected */
    this.serviceName = 'authentication-service';

    // Locators using modern Playwright patterns (getByRole, getByTestId, etc.)
    /** @readonly @type {import('@playwright/test').Locator} */
    this.emailOrMobileInput = this.getByRole('textbox', { name: 'Enter Email ID or Mobile' });
    /** @readonly @type {import('@playwright/test').Locator} */
    this.sendOtpButton = this.getByRole('link', { name: 'SEND OTP' });
    /** @readonly @type {import('@playwright/test').Locator} */
    this.otpInput = this.getByRole('textbox', { name: 'One Time Password' });
    /** @readonly @type {import('@playwright/test').Locator} */
    this.doneButton = this.getByRole('link', { name: 'DONE' });
    /** @readonly @type {import('@playwright/test').Locator} */
    this.errorMessage = this.getByTestId('error-message');
  }

  /**
   * Get singleton instance
   * @param {import('@playwright/test').Page} page 
   * @returns {LoginPage}
   */
  static getInstance(page) {
    if (!LoginPage._instance || LoginPage._currentPage !== page) {
      LoginPage._instance = new LoginPage(page);
      LoginPage._currentPage = page;
    }
    return LoginPage._instance;
  }

  /**
   * Login with OTP (actual flow for your app)
   * Uses PlaywrightWrapper + SmartLocator for self-healing
   * @param {string} mobile - 10-digit mobile number
   * @param {string} otp - 6-digit OTP
   * @returns {Promise<void>}
   */
  async loginWithOTP(mobile, otp) {
    logger.info(`[LoginPage] 🔐 Logging in with: ${mobile}`);
    
    // Fill mobile/email
    await this.fill(this.emailOrMobileInput, mobile, 'Email/Mobile Input');
    
    // Click Send OTP
    await this.click(this.sendOtpButton, 'Send OTP Button');
    
    // Wait for OTP input to appear
    await this.waitForLocator(this.otpInput, 'visible', 10000);
    
    // Fill OTP
    await this.fill(this.otpInput, otp, 'OTP Input');
    
    // Click Done
    await this.click(this.doneButton, 'Done Button');
    
    // Wait for login to complete
    await this.page.waitForURL(/\/(dashboard|home|overview|cart)/, { timeout: 15000 });
    
    logger.info('[LoginPage] ✅ Login successful');
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
   * Check if user is logged in
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    // Check if login form is NOT visible
    const loginFormVisible = await this.emailOrMobileInput
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    
    return !loginFormVisible;
  }
}

module.exports = { LoginPage };