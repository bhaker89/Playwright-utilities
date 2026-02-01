import { test, expect, logger } from '../../fixtures/base-test';
import { LoginPage } from '../../pages/login.page';
import { AuthHelper } from '../../utils/auth-helper';
import * as authData from '../../test-data/auth-credentials.json';

/**
 * Login Functionality Tests
 * Tests the login flow itself using real locators
 * 
 * NOTE) inherits before/after hooks from BaseTest!
 * - No need to duplicate beforeEach/afterEach
 * - Screenshots on failure are automatic
 * - Logging is automatic
 */

test.describe('Login Functionality - 1mg', () => {
  let loginPage;
  let authHelper;

  // ========== SUITE-LEVEL HOOKS ==========
  test.beforeAll(async () => {
    logger.info('🏁 LOGIN TEST SUITE STARTING');
    logger.info('Testing steve.1mg.com login functionality');
  });

  test.afterAll(async () => {
    logger.info('🏁 LOGIN TEST SUITE COMPLETED');
  });

  // ========== TEST-LEVEL SETUP ==========
  // Note: beforeEach from BaseTest runs automatically!
  // We only add test-specific setup here
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    authHelper = new AuthHelper(page);

    // Clear any existing auth
    await authHelper.clearAuth();

    // Navigate to login page
    await loginPage.navigate();
    logger.info('✅ Setup complete - on login page');
  });

  /**
   * TC_LOGIN_001) Mobile + OTP Login
   */
  test('TC_LOGIN_001 - Should login successfully with valid mobile and OTP', async ({ page }) => {
    const { mobile, otp } = authData.validUser;

    logger.info('Step 1) mobile number');
    await loginPage.emailOrMobileInput.fill(mobile);
    await expect(loginPage.emailOrMobileInput).toHaveValue(mobile);

    logger.info('Step 2) Send OTP');
    await loginPage.sendOtpButton.click();

    logger.info('Step 3) for OTP screen');
    await expect(loginPage.otpInput).toBeVisible({ timeout: 15000 });

    logger.info('Step 4) OTP');
    await loginPage.otpInput.fill(otp);
    await expect(loginPage.otpInput).toHaveValue(otp);

    logger.info('Step 5) Done');
    await loginPage.doneButton.click();

    logger.info('Step 6) login success');
    await page.waitForLoadState('networkidle');

    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();

    logger.info('✅ Login successful!');
  });

  /**
   * TC_LOGIN_002) Email + OTP Login
   */
  test('TC_LOGIN_002 - Should login successfully with valid email and OTP', async ({ page }) => {
    const { email, otp } = authData.validUser;

    logger.info('Step 1) email');
    await loginPage.emailOrMobileInput.fill(email);

    logger.info('Step 2) OTP');
    await loginPage.sendOtpButton.click();

    logger.info('Step 3) for OTP screen');
    await expect(loginPage.otpInput).toBeVisible({ timeout: 15000 });

    logger.info('Step 4) OTP and submit');
    await loginPage.otpInput.fill(otp);
    await loginPage.doneButton.click();

    logger.info('Step 5) login');
    await page.waitForTimeout(3000);
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();

    logger.info('✅ Email login successful!');
  });

  /**
   * TC_LOGIN_003) Mobile Number
   */
  test('TC_LOGIN_003 - Should reject invalid mobile number', async ({ page }) => {
    const invalidMobile = '12345'; // Too short

    logger.info('Step 1) invalid mobile');
    await loginPage.emailOrMobileInput.fill(invalidMobile);

    logger.info('Step 2) to send OTP');
    await loginPage.sendOtpButton.click();

    logger.info('Step 3) OTP screen does not appear');
    await page.waitForTimeout(3000);

    const otpVisible = await loginPage.otpInput.isVisible({ timeout: 3000 }).catch(() => false);
    expect(otpVisible).toBeFalsy();

    logger.info('✅ Invalid mobile rejected correctly');
  });

  /**
   * TC_LOGIN_004) Login Modal
   */
  test('TC_LOGIN_004 - Should close login modal without logging in', async ({ page }) => {
    logger.info('Step 1) login form is visible');
    await expect(loginPage.emailOrMobileInput).toBeVisible();

    logger.info('Step 2) login modal');
    await loginPage.closeLoginModal();

    logger.info('Step 3) modal is closed');
    await page.waitForTimeout(2000);
    const formVisible = await loginPage.emailOrMobileInput.isVisible({ timeout: 2000 }).catch(() => false);
    expect(formVisible).toBeFalsy();

    logger.info('✅ Login modal closed successfully');
  });

  // Note: afterEach from BaseTest runs automatically here!
  // - Takes screenshot on failure
  // - Logs test completion
});
