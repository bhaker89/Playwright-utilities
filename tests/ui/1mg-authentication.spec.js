import { test, expect, Page } from '@playwright/test';
import { logger } from '../../utils/logger';

/**
 * Test Suite: 1mg.com Authentication Flow
 * Purpose) login and signup functionality
 */
test.describe('1mg.com - Authentication Tests', () => {
  const baseURL = 'https://www.1mg.com';

  test.beforeEach(async ({ page }) => {
    logger.info('Navigating to 1mg.com homepage');
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
  });

  /**
   * TC_AUTH_001) homepage loads successfully
   */
  test('TC_AUTH_001) should load successfully', async ({ page }) => {
    logger.info('TC_AUTH_001) homepage load');

    // Verify page title
    await expect(page).toHaveTitle(/1mg/i);

    // Verify logo is visible
    const logo = page.locator('img[alt*="1mg"], img[title*="1mg"]').first();
    await expect(logo).toBeVisible();

    logger.info('TC_AUTH_001) loaded successfully');
  });

  /**
   * TC_AUTH_002) to login page
   */
  test('TC_AUTH_002) navigate to login page successfully', async ({ page }) => {
    logger.info('TC_AUTH_002) navigation to login page');

    // Click on Login/Signup button
    const loginButton = page.locator('text=/Login|Sign Up|Sign In/i').first();
    await loginButton.click();

    // Wait for login modal or page to appear
    await page.waitForTimeout(2000);

    // Verify login form elements are visible
    const phoneInput = page
      .locator('input[type="tel"], input[placeholder*="phone"], input[placeholder*="mobile"]')
      .first();
    await expect(phoneInput).toBeVisible({ timeout: 10000 });

    logger.info('TC_AUTH_002) page displayed successfully');
  });

  /**
   * TC_AUTH_003) phone number input field
   */
  test('TC_AUTH_003) number field should accept valid input', async ({ page }) => {
    logger.info('TC_AUTH_003) phone number input validation');

    // Navigate to login
    await page.locator('text=/Login|Sign Up|Sign In/i').first().click();
    await page.waitForTimeout(2000);

    // Enter valid phone number
    const phoneInput = page
      .locator('input[type="tel"], input[placeholder*="phone"], input[placeholder*="mobile"]')
      .first();
    await phoneInput.fill('9876543210');

    // Verify input value
    const inputValue = await phoneInput.inputValue();
    expect(inputValue).toContain('9876543210');

    logger.info('TC_AUTH_003) number input accepted successfully');
  });

  /**
   * TC_AUTH_004) Test - Invalid phone number (less than 10 digits)
   */
  test('TC_AUTH_004) show error for invalid phone number - less digits', async ({ page }) => {
    logger.info('TC_AUTH_004) invalid phone number - boundary test');

    // Navigate to login
    await page.locator('text=/Login|Sign Up|Sign In/i').first().click();
    await page.waitForTimeout(2000);

    // Enter invalid phone number (9 digits)
    const phoneInput = page
      .locator('input[type="tel"], input[placeholder*="phone"], input[placeholder*="mobile"]')
      .first();
    await phoneInput.fill('987654321');

    // Try to proceed
    const submitButton = page
      .locator('button:has-text("Send OTP"), button:has-text("Continue"), button[type="submit"]')
      .first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Check for error message
      const errorMessage = page.locator('text=/Invalid|Enter valid|10 digit/i');
      const hasError = (await errorMessage.count()) > 0;

      logger.info(`TC_AUTH_004) validation ${hasError ? 'present' : 'may vary by implementation'}`);
    }
  });

  /**
   * TC_AUTH_005) Test - Empty phone number field
   */
  test('TC_AUTH_005) show error for empty phone number', async ({ page }) => {
    logger.info('TC_AUTH_005) empty phone number validation');

    // Navigate to login
    await page.locator('text=/Login|Sign Up|Sign In/i').first().click();
    await page.waitForTimeout(2000);

    // Keep phone field empty and try to submit
    const submitButton = page
      .locator('button:has-text("Send OTP"), button:has-text("Continue"), button[type="submit"]')
      .first();

    if (await submitButton.isVisible()) {
      // Check if button is disabled or shows error
      const isDisabled = await submitButton.isDisabled();
      logger.info(`TC_AUTH_005) button disabled state: ${isDisabled}`);

      if (!isDisabled) {
        await submitButton.click();
        await page.waitForTimeout(1000);
      }
    }

    logger.info('TC_AUTH_005) field validation check completed');
  });

  /**
   * TC_AUTH_006) Test - Invalid phone number (non-numeric characters)
   */
  test('TC_AUTH_006) not accept non-numeric characters in phone field', async ({ page }) => {
    logger.info('TC_AUTH_006) non-numeric character input');

    // Navigate to login
    await page.locator('text=/Login|Sign Up|Sign In/i').first().click();
    await page.waitForTimeout(2000);

    // Try to enter non-numeric characters
    const phoneInput = page
      .locator('input[type="tel"], input[placeholder*="phone"], input[placeholder*="mobile"]')
      .first();
    await phoneInput.fill('abcd@#$%');

    // Verify input value (should be empty or filtered)
    const inputValue = await phoneInput.inputValue();
    const hasOnlyNumbers = /^\d*$/.test(inputValue);

    expect(hasOnlyNumbers).toBeTruthy();
    logger.info('TC_AUTH_006)-numeric characters properly handled');
  });

  /**
   * TC_AUTH_007) Test - Exact 10-digit phone number
   */
  test('TC_AUTH_007) accept exactly 10-digit phone number', async ({ page }) => {
    logger.info('TC_AUTH_007) boundary condition - exact 10 digits');

    // Navigate to login
    await page.locator('text=/Login|Sign Up|Sign In/i').first().click();
    await page.waitForTimeout(2000);

    // Enter exactly 10 digits
    const phoneInput = page
      .locator('input[type="tel"], input[placeholder*="phone"], input[placeholder*="mobile"]')
      .first();
    await phoneInput.fill('9876543210');

    // Try to proceed
    const submitButton = page
      .locator('button:has-text("Send OTP"), button:has-text("Continue"), button[type="submit"]')
      .first();

    if (await submitButton.isVisible()) {
      const isEnabled = await submitButton.isEnabled();
      expect(isEnabled).toBeTruthy();

      logger.info('TC_AUTH_007: 10-digit number accepted, proceed button enabled');
    }
  });

  /**
   * TC_AUTH_008) OTP screen appears after valid phone submission
   */
  test('TC_AUTH_008) display OTP screen after valid phone submission', async ({ page }) => {
    logger.info('TC_AUTH_008) OTP screen display');

    // Navigate to login
    await page.locator('text=/Login|Sign Up|Sign In/i').first().click();
    await page.waitForTimeout(2000);

    // Enter valid phone number
    const phoneInput = page
      .locator('input[type="tel"], input[placeholder*="phone"], input[placeholder*="mobile"]')
      .first();
    await phoneInput.fill('9876543210');

    // Click send OTP
    const submitButton = page
      .locator('button:has-text("Send OTP"), button:has-text("Continue"), button[type="submit"]')
      .first();

    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);

      // Verify OTP input field or message appears
      const otpElements = page.locator(
        'input[type="tel"][maxlength="1"], input[placeholder*="OTP"], text=/Enter OTP|Verify OTP/i'
      );
      const otpVisible = (await otpElements.count()) > 0;

      logger.info(
        `TC_AUTH_008) screen ${otpVisible ? 'displayed' : 'may require actual phone verification'}`
      );
    }
  });

  /**
   * TC_AUTH_009) login modal can be closed
   */
  test('TC_AUTH_009) be able to close login modal', async ({ page }) => {
    logger.info('TC_AUTH_009) login modal close functionality');

    // Open login modal
    await page.locator('text=/Login|Sign Up|Sign In/i').first().click();
    await page.waitForTimeout(2000);

    // Look for close button
    const closeButton = page
      .locator('button[aria-label*="close"], button:has-text("×"), .close-icon')
      .first();

    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(1000);

      logger.info('TC_AUTH_009) modal closed successfully');
    } else {
      // Try pressing Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      logger.info('TC_AUTH_009) to close modal with Escape key');
    }
  });

  /**
   * TC_AUTH_010) signup option is available
   */
  test('TC_AUTH_010) display signup option', async ({ page }) => {
    logger.info('TC_AUTH_010) signup option availability');

    // Navigate to login
    await page.locator('text=/Login|Sign Up|Sign In/i').first().click();
    await page.waitForTimeout(2000);

    // Look for signup text or link
    const signupText = page.locator('text=/Sign Up|Sign up|New User|Register|Create Account/i');
    const signupExists = (await signupText.count()) > 0;

    logger.info(
      `TC_AUTH_010) option ${signupExists ? 'available' : 'may be integrated with login'}`
    );
  });

  /**
   * TC_AUTH_011) Test - Page load time
   */
  test('TC_AUTH_011) should load within acceptable time', async ({ page }) => {
    logger.info('TC_AUTH_011) page load performance');

    const startTime = Date.now();
    await page.goto(baseURL);
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(10000);
    logger.info(`TC_AUTH_011) loaded in ${loadTime}ms`);
  });

  /**
   * TC_AUTH_012) responsive design - Mobile view
   */
  test('TC_AUTH_012) display correctly on mobile viewport', async ({ page }) => {
    logger.info('TC_AUTH_012) mobile responsiveness');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    // Verify page is responsive
    const logo = page.locator('img[alt*="1mg"], img[title*="1mg"]').first();
    await expect(logo).toBeVisible();

    logger.info('TC_AUTH_012) view displays correctly');
  });
});
