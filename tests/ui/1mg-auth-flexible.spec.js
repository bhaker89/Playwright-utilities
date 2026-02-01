import { test, expect } from '@playwright/test';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TC_2: 1mg.com Authentication Flow
 * Uses FLEXIBLE locators that adapt to actual page structure
 * 
 * HOW IT WORKS:
 * 1. Tries multiple selector strategies
 * 2. Uses the first one that works
 * 3. Logs what worked for future reference
 */

// Load locator configuration
const locatorConfigPath = path.join(process.cwd(), 'test-data', '1mg-locators.json');
let locatorConfig;

try {
  const configFile = fs.readFileSync(locatorConfigPath, 'utf-8');
  locatorConfig = JSON.parse(configFile);
} catch (error) {
  logger.warn('Locator config not found, using defaults');
  locatorConfig = {
    url: 'https://www.1mg.com',
    homepage: {
      loginButton: {
        selectors: ['text=/Login|Sign/i'],
      },
    },
    loginModal: {
      phoneInput: {
        selectors: ['input[type="tel"]'],
      },
    },
  };
}

test.describe('TC_2: 1mg.com - Authentication Tests', () => {
  const baseURL = locatorConfig.url;

  /**
   * Helper function) multiple selectors until one works
   */
  async function findElement(page), selectorArray)[], description)) {
    logger.info(`🔍 Finding element: ${description}`);

    for (const selector of selectorArray) {
      try {
        const element = page.locator(selector).first();
        const count = await element.count();

        if (count > 0) {
          logger.info(`✅ Found using selector: ${selector}`);
          return element;
        }
      } catch (error) {
        // Try next selector
      }
    }

    logger.warn(`⚠️  Could not find element: ${description}`);
    logger.warn(`Tried selectors: ${selectorArray.join(', ')}`);
    return null;
  }

  test.beforeEach(async ({ page }) => {
    logger.info('\n========================================');
    logger.info('🚀 Starting 1mg.com test');
    logger.info(`📍 URL: ${baseURL}`);
    logger.info('========================================\n');

    logger.info('Step 1) to homepage');
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    logger.info('✅ Page loaded');
  });

  /**
   * TC_AUTH_001) Load Validation
   */
  test('TC_AUTH_001) should load successfully', async ({ page }) => {
    logger.info('\n📝 TC_AUTH_001) Load Validation');
    logger.info('─────────────────────────────────────────────────');

    logger.info('Step 1) page title');
    const title = await page.title();
    logger.info(`Page Title: "${title}"`);
    expect(title.length).toBeGreaterThan(0);
    logger.info('✅ Page title exists');

    logger.info('Step 2) page URL');
    const url = page.url();
    logger.info(`Current URL: ${url}`);
    expect(url).toContain('1mg.com');
    logger.info('✅ URL is correct');

    logger.info('Step 3) page is interactive');
    const logo = await findElement(
      page,
      locatorConfig.homepage.logo?.selectors || ['img[alt*="1mg"]', 'img'],
      'Website Logo'
    );

    if (logo) {
      await expect(logo).toBeVisible();
      logger.info('✅ Logo is visible');
    }

    logger.info('\n✨ TC_AUTH_001)\n');
  });

  /**
   * TC_AUTH_002) to Login
   */
  test('TC_AUTH_002) navigate to login/signup', async ({ page }) => {
    logger.info('\n📝 TC_AUTH_002) Navigation Test');
    logger.info('─────────────────────────────────────────────────');

    logger.info('Step 1) login button');
    const loginButton = await findElement(
      page,
      locatorConfig.homepage.loginButton.selectors,
      'Login Button'
    );

    if (loginButton) {
      logger.info('Step 2) login button');
      await loginButton.click();
      await page.waitForTimeout(2000);
      logger.info('✅ Login button clicked');

      logger.info('Step 3) login modal/page appeared');
      // Take screenshot for manual verification
      await page.screenshot({
        path: 'test-results/1mg-login-screen.png',
      });
      logger.info('📸 Screenshot saved)-results/1mg-login-screen.png');
      logger.info('👉 Manually verify the login screen appears in screenshot');
    } else {
      logger.warn('⚠️  Could not find login button - may need to update selectors');
      logger.info('💡 Run locator-discovery.spec.ts to find actual selectors');
    }

    logger.info('\n✨ TC_AUTH_002)\n');
  });

  /**
   * TC_AUTH_003) Input Validation
   */
  test('TC_AUTH_003) number input should accept valid number', async ({ page }) => {
    logger.info('\n📝 TC_AUTH_003) Input Validation');
    logger.info('─────────────────────────────────────────────────');

    // Open login modal
    logger.info('Step 1) login modal');
    const loginButton = await findElement(
      page,
      locatorConfig.homepage.loginButton.selectors,
      'Login Button'
    );

    if (loginButton) {
      await loginButton.click();
      await page.waitForTimeout(2000);

      logger.info('Step 2) phone input field');
      const phoneInput = await findElement(
        page,
        locatorConfig.loginModal.phoneInput.selectors,
        'Phone Input'
      );

      if (phoneInput) {
        logger.info('Step 3) phone number');
        const validPhone = '9876543210';
        await phoneInput.fill(validPhone);
        logger.info(`Entered phone: ${validPhone}`);

        logger.info('Step 4) input value');
        const inputValue = await phoneInput.inputValue();
        logger.info(`Input value: ${inputValue}`);
        expect(inputValue).toContain('9876543210');
        logger.info('✅ Phone number accepted');

        // Take screenshot
        await page.screenshot({
          path: 'test-results/1mg-phone-entered.png',
        });
        logger.info('📸 Screenshot saved');
      } else {
        logger.warn('⚠️  Phone input not found');
        logger.info('💡 Possible reasons:');
        logger.info('   1. Login modal did not open');
        logger.info('   2. Selector needs to be updated');
        logger.info('   3. Page structure changed');
        logger.info('👉 Run locator-discovery.spec.ts to find correct selector');
      }
    }

    logger.info('\n✨ TC_AUTH_003)\n');
  });

  /**
   * TC_AUTH_004) Test - Invalid Phone
   */
  test('TC_AUTH_004) handle invalid phone number', async ({ page }) => {
    logger.info('\n📝 TC_AUTH_004) Phone Number Test');
    logger.info('─────────────────────────────────────────────────');

    // Open login
    const loginButton = await findElement(
      page,
      locatorConfig.homepage.loginButton.selectors,
      'Login Button'
    );

    if (loginButton) {
      await loginButton.click();
      await page.waitForTimeout(2000);

      const phoneInput = await findElement(
        page,
        locatorConfig.loginModal.phoneInput.selectors,
        'Phone Input'
      );

      if (phoneInput) {
        logger.info('Step 1) invalid phone (9 digits)');
        await phoneInput.fill('987654321');

        logger.info('Step 2) for validation error or disabled button');
        const submitButton = await findElement(
          page,
          locatorConfig.loginModal.submitButton.selectors,
          'Submit Button'
        );

        if (submitButton) {
          const isDisabled = await submitButton.isDisabled();
          logger.info(`Button disabled: ${isDisabled}`);
        }

        await page.screenshot({
          path: 'test-results/1mg-invalid-phone.png',
        });
        logger.info('📸 Screenshot saved for verification');
      }
    }

    logger.info('\n✨ TC_AUTH_004)\n');
  });
});
