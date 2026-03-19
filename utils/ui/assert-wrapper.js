const { expect } = require('@playwright/test');
const { logger } = require('../base/logger');

/**
 * AssertWrapper
 * Consistent assertion layer with logging
 * Wraps Playwright expect() with meaningful logs for debugging
 * 
 * USAGE:
 * ```js
 * const assert = new AssertWrapper(page);
 * await assert.toBeVisible('button.submit', 'Submit Button');
 * await assert.toHaveText('.message', 'Success', 'Success Message');
 * await assert.toHaveURL(/\/dashboard/, 'Dashboard URL');
 * ```
 */
class AssertWrapper {
  /**
   * @param {import('@playwright/test').Page} page 
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Assert element is visible
   * @param {string} selector 
   * @param {string} [elementName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toBeVisible(selector, elementName, options = {}) {
    const name = elementName || selector;
    await expect(this.page.locator(selector)).toBeVisible(options);
    logger.info(`[Assert] ✅ "${name}" is visible`);
  }

  /**
   * Assert element is hidden
   * @param {string} selector 
   * @param {string} [elementName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toBeHidden(selector, elementName, options = {}) {
    const name = elementName || selector;
    await expect(this.page.locator(selector)).toBeHidden(options);
    logger.info(`[Assert] ✅ "${name}" is hidden`);
  }

  /**
   * Assert element is enabled
   * @param {string} selector 
   * @param {string} [elementName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toBeEnabled(selector, elementName, options = {}) {
    const name = elementName || selector;
    await expect(this.page.locator(selector)).toBeEnabled(options);
    logger.info(`[Assert] ✅ "${name}" is enabled`);
  }

  /**
   * Assert element is disabled
   * @param {string} selector 
   * @param {string} [elementName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toBeDisabled(selector, elementName, options = {}) {
    const name = elementName || selector;
    await expect(this.page.locator(selector)).toBeDisabled(options);
    logger.info(`[Assert] ✅ "${name}" is disabled`);
  }

  /**
   * Assert element contains text
   * @param {string} selector 
   * @param {string | RegExp} text 
   * @param {string} [elementName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toHaveText(selector, text, elementName, options = {}) {
    const name = elementName || selector;
    await expect(this.page.locator(selector)).toHaveText(text, options);
    logger.info(`[Assert] ✅ "${name}" has text: "${text}"`);
  }

  /**
   * Assert element contains text (substring match)
   * @param {string} selector 
   * @param {string | RegExp} text 
   * @param {string} [elementName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toContainText(selector, text, elementName, options = {}) {
    const name = elementName || selector;
    await expect(this.page.locator(selector)).toContainText(text, options);
    logger.info(`[Assert] ✅ "${name}" contains: "${text}"`);
  }

  /**
   * Assert element has attribute value
   * @param {string} selector 
   * @param {string} attribute 
   * @param {string | RegExp} value 
   * @param {string} [elementName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toHaveAttribute(selector, attribute, value, elementName, options = {}) {
    const name = elementName || selector;
    await expect(this.page.locator(selector)).toHaveAttribute(attribute, value, options);
    logger.info(`[Assert] ✅ "${name}" has attribute ${attribute}="${value}"`);
  }

  /**
   * Assert element has class
   * @param {string} selector 
   * @param {string | RegExp} className 
   * @param {string} [elementName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toHaveClass(selector, className, elementName, options = {}) {
    const name = elementName || selector;
    await expect(this.page.locator(selector)).toHaveClass(className, options);
    logger.info(`[Assert] ✅ "${name}" has class: "${className}"`);
  }

  /**
   * Assert element count
   * @param {string} selector 
   * @param {number} count 
   * @param {string} [elementName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toHaveCount(selector, count, elementName, options = {}) {
    const name = elementName || selector;
    await expect(this.page.locator(selector)).toHaveCount(count, options);
    logger.info(`[Assert] ✅ "${name}" count is: ${count}`);
  }

  /**
   * Assert input value
   * @param {string} selector 
   * @param {string | RegExp} value 
   * @param {string} [fieldName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toHaveValue(selector, value, fieldName, options = {}) {
    const name = fieldName || selector;
    await expect(this.page.locator(selector)).toHaveValue(value, options);
    logger.info(`[Assert] ✅ "${name}" has value: "${value}"`);
  }

  /**
   * Assert page URL
   * @param {string | RegExp} url 
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toHaveURL(url, options = {}) {
    await expect(this.page).toHaveURL(url, options);
    logger.info(`[Assert] ✅ URL matches: ${url}`);
  }

  /**
   * Assert page title
   * @param {string | RegExp} title 
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toHaveTitle(title, options = {}) {
    await expect(this.page).toHaveTitle(title, options);
    logger.info(`[Assert] ✅ Title is: "${title}"`);
  }

  /**
   * Assert element is checked (checkbox/radio)
   * @param {string} selector 
   * @param {string} [elementName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toBeChecked(selector, elementName, options = {}) {
    const name = elementName || selector;
    await expect(this.page.locator(selector)).toBeChecked(options);
    logger.info(`[Assert] ✅ "${name}" is checked`);
  }

  /**
   * Assert element is not checked
   * @param {string} selector 
   * @param {string} [elementName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async not_toBeChecked(selector, elementName, options = {}) {
    const name = elementName || selector;
    await expect(this.page.locator(selector)).not.toBeChecked(options);
    logger.info(`[Assert] ✅ "${name}" is not checked`);
  }

  /**
   * Assert toast/notification appears (by text)
   * @param {string} message 
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async toastVisible(message, options = {}) {
    const timeout = options.timeout || 5000;
    await expect(this.page.getByText(message)).toBeVisible({ timeout });
    logger.info(`[Assert] ✅ Toast visible: "${message}"`);
  }

  /**
   * Soft assertion (doesn't stop test on failure)
   * @param {Function} assertionFn - Async assertion function
   * @param {string} [description]
   * @returns {Promise<void>}
   */
  async soft(assertionFn, description) {
    try {
      await assertionFn();
      if (description) {
        logger.info(`[Assert] ✅ Soft: ${description}`);
      }
    } catch (error) {
      logger.warn(`[Assert] ⚠️  Soft assertion failed: ${description || error.message}`);
      // Don't throw - soft assertion
    }
  }

  /**
   * Custom assertion with logging
   * @param {boolean} condition 
   * @param {string} message 
   * @returns {void}
   */
  assertTrue(condition, message) {
    if (!condition) {
      logger.error(`[Assert] ❌ ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    logger.info(`[Assert] ✅ ${message}`);
  }

  /**
   * Assert false with logging
   * @param {boolean} condition 
   * @param {string} message 
   * @returns {void}
   */
  assertFalse(condition, message) {
    if (condition) {
      logger.error(`[Assert] ❌ ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    logger.info(`[Assert] ✅ ${message}`);
  }
}

module.exports = { AssertWrapper };