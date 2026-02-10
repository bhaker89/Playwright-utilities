const { expect } = require('@playwright/test');
const { logger } = require('./logger');

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
 * Take screenshot with custom name
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {boolean} [fullPage=false]
 * @returns {Promise<Buffer>}
 */
async function takeScreenshot(page, name, fullPage = false) {
  const screenshot = await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage,
  });
  logger.info(`Screenshot taken: ${name}`);
  return screenshot;
}

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

module.exports = {
  waitForPageLoad,
  takeScreenshot,
  waitForElement,
  scrollToElement,
  generateRandomString,
  generateRandomEmail,
  generateRandomPhone,
  wait,
  retry,
};