const { logger } = require('../base/logger');
const { env } = require('../../config/environment.config');

/**
 * @typedef {Object} LoginCredentials
 * @property {string} emailOrMobile
 * @property {string} [otp]
 */

/**
 * Centralized Authentication Helper
 * Uses ACTUAL locators from Playwright Codegen
 * 
 * REAL LOCATORS from steve.1mg.com:
 * - Login input: getByRole('textbox', { name: 'Enter Email ID or Mobile' })
 * - Send OTP button: getByRole('link', { name: 'SEND OTP' })
 * - OTP input: getByRole('textbox', { name: 'One Time Password' })
 * - Done button: getByRole('link', { name: 'DONE' })
 * - Close button: getByRole('img', { name: 'Close' })
 */
class AuthHelper {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {string} [loginUrl]
   */
  constructor(page, loginUrl) {
    /** @private @type {import('@playwright/test').Page} */
    this.page = page;
    /** @private @type {string} */
    this.loginUrl = loginUrl || `${env.uiBaseURL}/?login=true&followup=/login`;
  }

  // REAL LOCATORS from codegen
  /** @private */
  emailOrMobileInput() {
    return this.page.getByRole('textbox', { name: 'Enter Email ID or Mobile' });
  }

  /** @private */
  sendOtpButton() {
    return this.page.getByRole('link', { name: 'SEND OTP' });
  }

  /** @private */
  loginButton() {
    return this.page.getByRole('link', { name: 'LOGIN', exact: true });
  }

  /** @private */
  otpInput() {
    return this.page.getByRole('textbox', { name: 'One Time Password' });
  }

  /** @private */
  doneButton() {
    return this.page.getByRole('link', { name: 'DONE' });
  }

  /** @private */
  closeButton() {
    return this.page.getByRole('img', { name: 'Close' });
  }

  /**
   * Login with Email/Mobile and OTP
   * Uses REAL selectors from 1mg.com
   * 
   * @param {string} emailOrMobile - Email address or 10-digit mobile number
   * @param {string} [otp] - 6-digit OTP (if available for testing)
   * @returns {Promise<void>}
   */
  async loginWithOTP(emailOrMobile, otp) {
    logger.info(`[AuthHelper] 🔐 Logging in with: ${emailOrMobile}`);

    // Navigate to login page
    // We wait for domcontentloaded only; the subsequent .waitFor() handles the rest.
    await this.page.goto(this.loginUrl, { waitUntil: 'domcontentloaded' });
    logger.info('[AuthHelper] Login page navigation started');

    // Enter email or mobile
    await this.emailOrMobileInput().waitFor({ state: 'visible', timeout: 10000 });
    await this.emailOrMobileInput().fill(emailOrMobile);
    logger.info(`[AuthHelper] Entered: ${emailOrMobile}`);

    // Click Send OTP button with retry for spinner/loading cases
    let otpScreenAppeared = false;
    for (let i = 0; i < 3; i++) {
      logger.info(`[AuthHelper] Clicking SEND OTP (Attempt ${i + 1}/3)...`);
      await this.sendOtpButton().click();

      try {
        // Wait for OTP input to appear
        await this.otpInput().waitFor({ state: 'visible', timeout: 10000 });
        otpScreenAppeared = true;
        logger.info('[AuthHelper] OTP screen appeared');
        break;
      } catch (error) {
        logger.warn(`[AuthHelper] OTP screen did not appear after attempt ${i + 1}`);
        if (i < 2) await this.page.waitForTimeout(2000);
      }
    }

    if (!otpScreenAppeared) {
      throw new Error('[AuthHelper] ❌ Failed to reach OTP screen after multiple attempts');
    }

    if (otp) {
      // Enter OTP
      await this.otpInput().fill(otp);
      logger.info(`[AuthHelper] Entered OTP: ${otp}`);

      // Click Done button
      await this.doneButton().click();
      logger.info('[AuthHelper] Clicked DONE. Waiting for session to establish...');

      // Verify login success with retries
      const isLoggedIn = await this.isUserLoggedIn(5); // 5 retries for slow staging redirects
      if (isLoggedIn) {
        logger.info('[AuthHelper] ✅ Login successful');
      } else {
        throw new Error('[AuthHelper] ❌ Login failed - user not detected as logged in after multiple retries. Possible invalid OTP or timeout.');
      }
    } else {
      logger.warn('[AuthHelper] ⚠️  OTP not provided - manual OTP entry required');
    }
  }

  /**
   * Check if user is logged in
   * Looks for common indicators of logged-in state with retries
   * @param {number} [retries=3]
   * @returns {Promise<boolean>}
   */
  async isUserLoggedIn(retries = 3) {
    for (let i = 0; i < retries; i++) {
      logger.info(`[AuthHelper] Checking login status (Attempt ${i + 1}/${retries})...`);

      // Check if login modal/popup is closed
      const loginInputVisible = await this.emailOrMobileInput()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (loginInputVisible) {
        logger.info('[AuthHelper] Login form still visible');
      } else {
        // Check for common logged-in indicators
        const loggedInSelectors = [
          'text=My Account',
          'text=Profile',
          'text=Logout',
          '[data-testid="user-profile"]',
          '[data-testid="user-name"]',
          '.user-profile',
          '.profile-name',
          'button:has-text("Logout")',
        ];

        for (const selector of loggedInSelectors) {
          const isVisible = await this.page.locator(selector)
            .first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

          if (isVisible) {
            logger.info(`[AuthHelper] ✅ User logged in - detected: ${selector}`);
            return true;
          }
        }

        // Check URL change (login modal typically closes after successful login)
        const currentUrl = this.page.url();
        if (!currentUrl.includes('login=true')) {
          logger.info('[AuthHelper] ✅ User logged in - URL changed');
          return true;
        }
      }

      // Wait a bit before next retry if not last attempt
      if (i < retries - 1) {
        await this.page.waitForTimeout(3000);
      }
    }

    logger.warn('[AuthHelper] ⚠️  Could not confirm login status after retries');
    return false;
  }

  /**
   * Close login modal/popup without logging in
   * @returns {Promise<void>}
   */
  async closeLoginModal() {
    logger.info('[AuthHelper] Closing login modal');

    const closeBtn = this.closeButton();
    if (await closeBtn.isVisible({ timeout: 3000 })) {
      await closeBtn.click();
      logger.info('[AuthHelper] Login modal closed');
    } else {
      logger.warn('[AuthHelper] Close button not found');
    }
  }

  /**
   * Save authentication state to file
   * This can be reused across tests to avoid repeated logins
   * @param {string} filePath
   * @returns {Promise<void>}
   */
  async saveAuthState(filePath) {
    await this.page.context().storageState({ path: filePath });
    logger.info(`[AuthHelper] 💾 Auth state saved to: ${filePath}`);
  }

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  async logout() {
    logger.info('[AuthHelper] 🚪 Logging out');

    const logoutSelectors = [
      'button:has-text("Logout")',
      'a:has-text("Logout")',
      'button:has-text("Sign Out")',
      'a:has-text("Sign Out")',
      '[data-testid="logout"]',
    ];

    for (const selector of logoutSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        await this.page.waitForLoadState('networkidle');
        logger.info('[AuthHelper] ✅ Logout successful');
        return;
      }
    }

    logger.warn('[AuthHelper] ⚠️  Logout button not found');
  }

  /**
   * Clear authentication (cookies, storage)
   * @returns {Promise<void>}
   */
  async clearAuth() {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    logger.info('[AuthHelper] 🗑️  Authentication cleared');
  }

  /**
   * Wait for OTP to be entered manually
   * Useful for testing scenarios where OTP cannot be automated
   * 
   * @param {number} [timeoutMs=120000] - Maximum time to wait for OTP entry (default: 2 minutes)
   * @returns {Promise<void>}
   */
  async waitForManualOTPEntry(timeoutMs = 120000) {
    logger.info('[AuthHelper] ⏳ Waiting for manual OTP entry...');
    logger.info(`[AuthHelper] Timeout: ${timeoutMs / 1000} seconds`);

    try {
      // Wait for OTP input to be filled
      await this.otpInput().waitFor({ state: 'hidden', timeout: timeoutMs });
      logger.info('[AuthHelper] ✅ OTP entered (input disappeared)');
    } catch (error) {
      logger.warn('[AuthHelper] ⚠️  Manual OTP entry timeout');
      throw new Error(`Manual OTP entry timeout after ${timeoutMs}ms`);
    }

    // Verify login success
    const isLoggedIn = await this.isUserLoggedIn();
    if (!isLoggedIn) {
      throw new Error('[AuthHelper] ❌ Login failed after OTP entry');
    }
  }
}

module.exports = { AuthHelper };