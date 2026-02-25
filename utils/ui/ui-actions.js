const { expect } = require('@playwright/test');
const { logger } = require('../base/logger');
const path = require('path');
const fs = require('fs');

/**
 * ============================================================================
 * UI ACTIONS - Centralized UI Helper Methods
 * ============================================================================
 * 
 * This module provides reusable UI interaction helpers for Playwright tests.
 * Organized by functionality: page load, screenshots, element interactions,
 * popups, downloads, uploads, toasts, frames, and permissions.
 * 
 * USAGE:
 * ------
 * ```javascript
 * const { clickAndWaitForPopup, uploadFile, expectToast } = require('../utils/ui/ui-actions');
 * 
 * // In test
 * const popup = await clickAndWaitForPopup(page, () => page.click('.open-popup'));
 * await uploadFile(page, '#file-input', './test-data/sample.pdf');
 * await expectToast(page, 'Success!', { timeout: 5000 });
 * ```
 * ============================================================================
 */

// ============================================================================
// PAGE LOAD & NAVIGATION
// ============================================================================

/**
 * Wait for page to be fully loaded
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=30000]
 * @returns {Promise<void>}
 */
async function waitForPageLoad(page, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
  logger.info('Page fully loaded');
}

/**
 * Wait for network idle with safe error handling
 * Optional wrapper around waitForLoadState for scenarios where network may not settle
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=10000]
 * @returns {Promise<void>}
 */
async function waitForNetworkIdleSafe(page, timeout = 10000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
    logger.info('Network idle achieved');
  } catch (error) {
    logger.warn(`Network idle not achieved within ${timeout}ms, continuing...`);
  }
}

// ============================================================================
// SCREENSHOT & VISUAL
// ============================================================================

/**
 * Take screenshot with custom name
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {boolean} [fullPage=false]
 * @returns {Promise<Buffer>}
 */
async function takeScreenshot(page, name, fullPage = false) {
  const screenshotDir = 'test-results/screenshots';
  
  // Ensure directory exists
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  const screenshot = await page.screenshot({
    path: `${screenshotDir}/${name}-${Date.now()}.png`,
    fullPage,
  });
  logger.info(`Screenshot taken: ${name}`);
  return screenshot;
}

// ============================================================================
// ELEMENT INTERACTION
// ============================================================================

/**
 * Wait for element to be visible and enabled
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {number} [timeout=10000]
 * @returns {Promise<void>}
 */
async function waitForElement(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  await expect(page.locator(selector)).toBeEnabled({ timeout });
  logger.info(`Element visible and enabled: ${selector}`);
}

/**
 * Scroll element into view
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @returns {Promise<void>}
 */
async function scrollToElement(page, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  logger.info(`Scrolled to element: ${selector}`);
}

// ============================================================================
// POPUP / NEW TAB HANDLING
// ============================================================================

/**
 * Click and wait for popup/new tab to open
 * Returns the new page object for interaction
 * 
 * @param {import('@playwright/test').Page} page - Current page
 * @param {Function|import('@playwright/test').Locator} clickFnOrLocator - Function to trigger popup or locator to click
 * @returns {Promise<import('@playwright/test').Page>} New popup page
 * 
 * @example
 * // Using a function
 * const popup = await clickAndWaitForPopup(page, async () => {
 *   await page.click('.open-help');
 * });
 * 
 * // Using a locator
 * const popup = await clickAndWaitForPopup(page, page.locator('.open-help'));
 * await expect(popup.locator('h1')).toContainText('Help');
 * await popup.close();
 */
async function clickAndWaitForPopup(page, clickFnOrLocator) {
  logger.info('Waiting for popup to open...');
  
  const [popup] = await Promise.all([
    page.context().waitForEvent('page'),
    typeof clickFnOrLocator === 'function' 
      ? clickFnOrLocator() 
      : clickFnOrLocator.click()
  ]);
  
  await popup.waitForLoadState('domcontentloaded');
  logger.info(`Popup opened: ${popup.url()}`);
  
  return popup;
}

// ============================================================================
// DOWNLOAD HANDLING
// ============================================================================

/**
 * Trigger download after clicking and return download info
 * 
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} locator - Element that triggers download
 * @param {Object} [options]
 * @param {string} [options.saveAsDir='test-results/downloads'] - Directory to save download
 * @returns {Promise<{download: import('@playwright/test').Download, path: string, filename: string}>}
 * 
 * @example
 * const result = await downloadAfterClick(page, page.locator('#download-btn'));
 * console.log('Downloaded to:', result.path);
 * console.log('Filename:', result.filename);
 */
async function downloadAfterClick(page, locator, options = {}) {
  const saveAsDir = options.saveAsDir || 'test-results/downloads';
  
  // Ensure directory exists
  if (!fs.existsSync(saveAsDir)) {
    fs.mkdirSync(saveAsDir, { recursive: true });
  }
  
  logger.info('Waiting for download...');
  
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    locator.click()
  ]);
  
  const filename = download.suggestedFilename();
  const filePath = path.join(saveAsDir, filename);
  await download.saveAs(filePath);
  
  logger.info(`Download complete: ${filename} -> ${filePath}`);
  
  return {
    download,
    path: filePath,
    filename
  };
}

// ============================================================================
// FILE UPLOAD
// ============================================================================

/**
 * Upload file to input element
 * 
 * @param {import('@playwright/test').Page} page
 * @param {string|import('@playwright/test').Locator} inputLocator - File input selector or locator
 * @param {string} filePath - Path to file to upload (relative or absolute)
 * @returns {Promise<void>}
 * 
 * @example
 * await uploadFile(page, '#file-input', './test-data/sample.pdf');
 * await uploadFile(page, page.locator('input[type="file"]'), '/absolute/path/to/file.jpg');
 */
async function uploadFile(page, inputLocator, filePath) {
  const locator = typeof inputLocator === 'string' 
    ? page.locator(inputLocator) 
    : inputLocator;
  
  // Resolve to absolute path if relative
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  
  await locator.setInputFiles(absolutePath);
  logger.info(`File uploaded: ${path.basename(absolutePath)}`);
}

// ============================================================================
// TOAST / NOTIFICATION
// ============================================================================

/**
 * Wait for and verify toast/notification message
 * 
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} message - Expected toast message
 * @param {Object} [options]
 * @param {string} [options.testId] - Test ID of toast element (e.g., 'toast-message')
 * @param {string} [options.selector='.toast, .notification, [role="alert"]'] - CSS selector for toast
 * @param {number} [options.timeout=5000] - Max wait time for toast to appear
 * @param {boolean} [options.disappear=false] - Whether to wait for toast to disappear
 * @returns {Promise<void>}
 * 
 * @example
 * // Using default selector
 * await expectToast(page, 'Login successful');
 * 
 * // Using test ID
 * await expectToast(page, /saved/i, { testId: 'toast-message', timeout: 3000 });
 * 
 * // Wait for disappearance
 * await expectToast(page, 'Copied!', { disappear: true });
 */
async function expectToast(page, message, options = {}) {
  const {
    testId,
    selector = '.toast, .notification, [role="alert"]',
    timeout = 5000,
    disappear = false
  } = options;
  
  const locator = testId 
    ? page.getByTestId(testId) 
    : page.locator(selector).first();
  
  logger.info(`Waiting for toast: "${message}"`);
  
  // Wait for toast to appear
  await expect(locator).toBeVisible({ timeout });
  
  // Verify message
  await expect(locator).toContainText(message, { timeout: 2000 });
  
  logger.info('Toast verified');
  
  // Optionally wait for disappearance
  if (disappear) {
    logger.info('Waiting for toast to disappear...');
    await expect(locator).toBeHidden({ timeout: timeout + 2000 });
    logger.info('Toast disappeared');
  }
}

// ============================================================================
// IFRAME HANDLING
// ============================================================================

/**
 * Execute actions within an iframe context
 * 
 * @param {import('@playwright/test').Page} page
 * @param {string} frameSelector - Selector for iframe element
 * @param {Function} fn - Async function to execute with frame context
 * @returns {Promise<*>} Result of the function
 * 
 * @example
 * await withinFrame(page, '#payment-iframe', async (frame) => {
 *   await frame.locator('#card-number').fill('4242424242424242');
 *   await frame.locator('#submit-payment').click();
 * });
 */
async function withinFrame(page, frameSelector, fn) {
  logger.info(`Switching to iframe: ${frameSelector}`);
  
  const frameElement = await page.frameLocator(frameSelector);
  const result = await fn(frameElement);
  
  logger.info('Iframe operation complete');
  return result;
}

// ============================================================================
// PERMISSIONS
// ============================================================================

/**
 * Grant browser permissions (geolocation, notifications, camera, etc.)
 * Requires context to be available
 * 
 * @param {import('@playwright/test').Page} page
 * @param {string[]} permissions - Array of permissions to grant
 * @param {string} [origin] - Optional origin URL (defaults to current page origin)
 * @returns {Promise<void>}
 * 
 * @example
 * await grantPermissions(page, ['geolocation', 'notifications']);
 * await grantPermissions(page, ['clipboard-read', 'clipboard-write'], 'https://example.com');
 */
async function grantPermissions(page, permissions, origin) {
  const context = page.context();
  const targetOrigin = origin || new URL(page.url()).origin;
  
  await context.grantPermissions(permissions, { origin: targetOrigin });
  logger.info(`Permissions granted: ${permissions.join(', ')} for ${targetOrigin}`);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate random string
 * @param {number} [length=10]
 * @returns {string}
 */
function generateRandomString(length = 10) {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Generate random email
 * @returns {string}
 */
function generateRandomEmail() {
  return `test_${generateRandomString(8)}@example.com`;
}

/**
 * Generate random phone number
 * @returns {string}
 */
function generateRandomPhone() {
  return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

/**
 * Wait for specified milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
async function wait(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @template T
 * @param {() => Promise<T>} fn
 * @param {number} [maxAttempts=3]
 * @param {number} [delay=1000]
 * @returns {Promise<T>}
 */
async function retry(fn, maxAttempts = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await wait(delay * attempt);
      logger.warn(`Retry attempt ${attempt} failed, retrying...`);
    }
  }
  throw new Error('Max retry attempts reached');
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Page Load & Navigation
  waitForPageLoad,
  waitForNetworkIdleSafe,
  
  // Screenshot & Visual
  takeScreenshot,
  
  // Element Interaction
  waitForElement,
  scrollToElement,
  
  // Popup / New Tab
  clickAndWaitForPopup,
  
  // Download
  downloadAfterClick,
  
  // Upload
  uploadFile,
  
  // Toast / Notification
  expectToast,
  
  // Iframe
  withinFrame,
  
  // Permissions
  grantPermissions,
  
  // Utilities
  generateRandomString,
  generateRandomEmail,
  generateRandomPhone,
  wait,
  retry,
};