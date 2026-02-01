import { test, expect } from '@playwright/test';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Locator Discovery Tool
 * This test helps you FIND actual locators on 1mg.com
 * Run this FIRST to discover the correct selectors!
 */
test.describe('1mg.com Locator Discovery Tool', () => {
  const websiteURL = 'https://www.1mg.com';
  const discoveredLocators) = {
    url: websiteURL,
    discoveryTimestamp: new Date().toISOString(),
    locators: {},
  };

  test('DISCOVERY_001) all possible login button locators', async ({ page }) => {
    logger.info('🔍 DISCOVERING login button locators on 1mg.com...');

    await page.goto(websiteURL);
    await page.waitForLoadState('networkidle');

    // Try various selectors
    const loginButtonSelectors = [
      'button:has-text("Login")',
      'button:has-text("Sign")',
      'a:has-text("Login")',
      'a:has-text("Sign")',
      '[data-test*="login"]',
      '[data-testid*="login"]',
      '.login-button',
      '.login-btn',
      '#login',
      'text=/Login|Sign Up|Sign In/i',
   ;

    const workingSelectors)[] = [];

    for (const selector of loginButtonSelectors) {
      try {
        const element = page.locator(selector).first();
        const count = await element.count();

        if (count > 0 && (await element.isVisible({ timeout: 2000 }))) {
          const text = await element.textContent();
          workingSelectors.push(selector);
          logger.info(`✅ FOUND: ${selector} - Text: "${text}"`);
        }
      } catch (error) {
        // Selector doesn't work, skip it
      }
    }

    discoveredLocators.locators.loginButton = workingSelectors;
    logger.info(`\n✨ Working Login Button Selectors: ${workingSelectors.length}`);
    workingSelectors.forEach((s) => logger.info(`   - ${s}`));

    expect(workingSelectors.length).toBeGreaterThan(0);
  });

  test('DISCOVERY_002) phone input field locators', async ({ page }) => {
    logger.info('🔍 DISCOVERING phone input field locators...');

    await page.goto(websiteURL);
    await page.waitForLoadState('networkidle');

    // Click login button first
    try {
      await page.locator('text=/Login|Sign/i').first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);
    } catch (error) {
      logger.warn('Could not click login button, continuing...');
    }

    const phoneInputSelectors = [
      'input[type="tel"]',
      'input[type="number"]',
      'input[placeholder*="phone"]',
      'input[placeholder*="Phone"]',
      'input[placeholder*="mobile"]',
      'input[placeholder*="Mobile"]',
      'input[placeholder*="number"]',
      'input[name="phone"]',
      'input[name="mobile"]',
      'input[name="phoneNumber"]',
      '#phone',
      '#mobile',
      '[data-test*="phone"]',
      '[data-testid*="phone"]',
   ;

    const workingSelectors)[] = [];

    for (const selector of phoneInputSelectors) {
      try {
        const element = page.locator(selector).first();
        const count = await element.count();

        if (count > 0) {
          const placeholder = await element.getAttribute('placeholder');
          const name = await element.getAttribute('name');
          workingSelectors.push(selector);
          logger.info(`✅ FOUND: ${selector} - Placeholder: "${placeholder}", Name: "${name}"`);
        }
      } catch (error) {
        // Selector doesn't work
      }
    }

    discoveredLocators.locators.phoneInput = workingSelectors;
    logger.info(`\n✨ Working Phone Input Selectors: ${workingSelectors.length}`);
    workingSelectors.forEach((s) => logger.info(`   - ${s}`));
  });

  test('DISCOVERY_003) entire page structure', async ({ page }) => {
    logger.info('🔍 CAPTURING page structure for analysis...');

    await page.goto(websiteURL);
    await page.waitForLoadState('networkidle');

    // Get all buttons
    const buttons = await page.locator('button').all();
    logger.info(`\n📊 Found ${buttons.length} buttons on page`);

    const buttonInfo = [];
    for (const button of buttons.slice(0, 10)) {
      // First 10 buttons
      try {
        const text = await button.textContent();
        const classes = await button.getAttribute('class');
        const id = await button.getAttribute('id');
        buttonInfo.push({ text, classes, id });
        logger.info(`  Button: "${text}" | Class: "${classes}" | ID: "${id}"`);
      } catch (error) {
        // Skip
      }
    }

    discoveredLocators.pageAnalysis = {
      totalButtons: buttons.length,
      sampleButtons: buttonInfo,
    };

    // Get all inputs
    const inputs = await page.locator('input').all();
    logger.info(`\n📊 Found ${inputs.length} input fields on page`);

    const inputInfo = [];
    for (const input of inputs.slice(0, 10)) {
      // First 10 inputs
      try {
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        const name = await input.getAttribute('name');
        inputInfo.push({ type, placeholder, name });
        logger.info(`  Input)="${type}" | Placeholder="${placeholder}" | Name="${name}"`);
      } catch (error) {
        // Skip
      }
    }

    discoveredLocators.pageAnalysis.sampleInputs = inputInfo;
  });

  test('DISCOVERY_004) screenshot with annotations', async ({ page }) => {
    logger.info('📸 Taking annotated screenshot...');

    await page.goto(websiteURL);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: 'test-results/1mg-homepage-discovery.png',
      fullPage: true,
    });

    logger.info('✅ Screenshot saved)-results/1mg-homepage-discovery.png');

    // Click login and screenshot modal
    try {
      await page.locator('text=/Login|Sign/i').first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: 'test-results/1mg-login-modal-discovery.png',
      });

      logger.info('✅ Login modal screenshot saved)-results/1mg-login-modal-discovery.png');
    } catch (error) {
      logger.warn('Could not capture login modal screenshot');
    }
  });

  test.afterAll(async () => {
    // Save discovered locators to JSON file
    const outputPath = path.join(process.cwd(), 'test-results', 'discovered-locators.json');
    fs.writeFileSync(outputPath, JSON.stringify(discoveredLocators, null, 2));
    logger.info(`\n💾 Discovered locators saved to: ${outputPath}`);
    logger.info('👉 Use these selectors in your actual tests!');
  });
});
