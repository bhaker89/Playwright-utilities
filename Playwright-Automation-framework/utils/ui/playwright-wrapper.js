const { logger } = require('../base/logger');
const { SmartLocator } = require('../../platform/core/smart-locator');

/**
 * PlaywrightWrapper
 * Singleton wrapper for Playwright UI actions with:
 * - Self-healing via SmartLocator
 * - Consistent logging
 * - Action abstraction
 * 
 * Inspired by 10xquality pattern but with self-healing built-in.
 * 
 * USAGE:
 * ```js
 * const wrapper = PlaywrightWrapper.getInstance(page);
 * await wrapper.goto('https://example.com');
 * await wrapper.click('button', 'Submit Button');
 * await wrapper.fill('input[name="email"]', 'test@example.com', 'Email Input');
 * ```
 */
class PlaywrightWrapper {
  /** @private */
  static instance = null;
  /** @private */
  static currentPage = null;

  /**
   * @private
   * @param {import('@playwright/test').Page} page 
   */
  constructor(page) {
    this.page = page;
    this.healer = new SmartLocator(page, 'PlaywrightWrapper');
  }

  /**
   * Get singleton instance
   * @param {import('@playwright/test').Page} page 
   * @returns {PlaywrightWrapper}
   */
  static getInstance(page) {
    if (!PlaywrightWrapper.instance || PlaywrightWrapper.currentPage !== page) {
      PlaywrightWrapper.instance = new PlaywrightWrapper(page);
      PlaywrightWrapper.currentPage = page;
      logger.debug('[PlaywrightWrapper] New instance created');
    }
    return PlaywrightWrapper.instance;
  }

  /**
   * Navigate to URL
   * @param {string} url 
   * @param {{ waitUntil?: 'load' | 'domcontentloaded' | 'networkidle', timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async goto(url, options = {}) {
    const defaultOptions = { waitUntil: 'domcontentloaded', timeout: 30000 };
    await this.page.goto(url, { ...defaultOptions, ...options });
    logger.info(`[Wrapper] 🌐 Navigate to: ${url}`);
  }

  /**
   * Click element with self-healing
   * @param {string} selector - CSS selector or Playwright locator string
   * @param {string} [elementName] - Logical name for healing/logging
   * @param {{ timeout?: number, force?: boolean }} [options]
   * @returns {Promise<void>}
   */
  async click(selector, elementName, options = {}) {
    const name = elementName || selector;
    const locator = this.page.locator(selector);
    
    await this.healer.executeWithHealing(name, locator, async (loc) => {
      await loc.click({ timeout: options.timeout || 5000, force: options.force });
    });
    
    logger.info(`[Wrapper] 🖱️  Click: ${name}`);
  }

  /**
   * Click by text content
   * @param {string} text 
   * @param {{ exact?: boolean }} [options]
   * @returns {Promise<void>}
   */
  async clickByText(text, options = {}) {
    const locator = this.page.getByText(text, options);
    
    await this.healer.executeWithHealing(text, locator, async (loc) => {
      await loc.click({ timeout: 5000 });
    });
    
    logger.info(`[Wrapper] 🖱️  Click by text: "${text}"`);
  }

  /**
   * Click by role (accessibility-first)
   * @param {'button' | 'link' | 'checkbox' | 'textbox' | 'heading' | 'listitem'} role 
   * @param {{ name?: string | RegExp, exact?: boolean }} [options]
   * @returns {Promise<void>}
   */
  async clickByRole(role, options = {}) {
    const name = options.name ? `${role}: ${options.name}` : role;
    const locator = this.page.getByRole(role, options);
    
    await this.healer.executeWithHealing(name, locator, async (loc) => {
      await loc.click({ timeout: 5000 });
    });
    
    logger.info(`[Wrapper] 🖱️  Click by role: ${name}`);
  }

  /**
   * Fill input with self-healing
   * @param {string} selector 
   * @param {string} value 
   * @param {string} [fieldName]
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async fill(selector, value, fieldName, options = {}) {
    const name = fieldName || selector;
    const locator = this.page.locator(selector);
    
    await this.healer.executeWithHealing(name, locator, async (loc) => {
      await loc.fill(value, { timeout: options.timeout || 5000 });
    });
    
    logger.info(`[Wrapper] ✏️  Fill "${name}": ${value.substring(0, 50)}...`);
  }

  /**
   * Fill by placeholder
   * @param {string} placeholder 
   * @param {string} value 
   * @returns {Promise<void>}
   */
  async fillByPlaceholder(placeholder, value) {
    const locator = this.page.getByPlaceholder(placeholder);
    
    await this.healer.executeWithHealing(placeholder, locator, async (loc) => {
      await loc.fill(value, { timeout: 5000 });
    });
    
    logger.info(`[Wrapper] ✏️  Fill placeholder "${placeholder}": ${value}`);
  }

  /**
   * Fill by label (form inputs)
   * @param {string | RegExp} label 
   * @param {string} value 
   * @returns {Promise<void>}
   */
  async fillByLabel(label, value) {
    const labelStr = typeof label === 'string' ? label : label.toString();
    const locator = this.page.getByLabel(label);
    
    await this.healer.executeWithHealing(labelStr, locator, async (loc) => {
      await loc.fill(value, { timeout: 5000 });
    });
    
    logger.info(`[Wrapper] ✏️  Fill label "${labelStr}": ${value}`);
  }

  /**
   * Select dropdown option (click trigger → click option)
   * Common pattern for custom dropdowns
   * @param {string} triggerSelector - Selector for dropdown trigger
   * @param {string} optionText - Text of option to select
   * @param {string} [dropdownName]
   * @returns {Promise<void>}
   */
  async selectDropdownOption(triggerSelector, optionText, dropdownName) {
    const name = dropdownName || triggerSelector;
    
    // Click trigger
    await this.click(triggerSelector, `${name} (trigger)`);
    await this.page.waitForTimeout(500); // Wait for dropdown to appear
    
    // Click option
    await this.clickByText(optionText, { exact: true });
    
    logger.info(`[Wrapper] 📋 Select dropdown "${name}": ${optionText}`);
  }

  /**
   * Search and select (for searchable dropdowns)
   * @param {string} triggerSelector 
   * @param {string} searchText 
   * @param {string} optionText 
   * @param {string} [dropdownName]
   * @returns {Promise<void>}
   */
  async searchAndSelect(triggerSelector, searchText, optionText, dropdownName) {
    const name = dropdownName || triggerSelector;
    
    await this.click(triggerSelector, `${name} (trigger)`);
    await this.page.waitForTimeout(300);
    
    const searchInput = this.page.getByPlaceholder(/search/i);
    await searchInput.fill(searchText);
    await this.page.waitForTimeout(500);
    
    await this.clickByText(optionText, { exact: true });
    
    logger.info(`[Wrapper] 🔍 Search "${searchText}" and select: ${optionText}`);
  }

  /**
   * Wait for selector to be visible
   * @param {string} selector 
   * @param {{ state?: 'visible' | 'hidden' | 'attached', timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async waitForSelector(selector, options = {}) {
    await this.page.locator(selector).waitFor({
      state: options.state || 'visible',
      timeout: options.timeout || 10000
    });
    logger.info(`[Wrapper] ⏳ Wait for: ${selector}`);
  }

  /**
   * Wait for text to appear
   * @param {string} text 
   * @param {number} [timeout=10000]
   * @returns {Promise<void>}
   */
  async waitForText(text, timeout = 10000) {
    await this.page.getByText(text).waitFor({ state: 'visible', timeout });
    logger.info(`[Wrapper] ⏳ Wait for text: "${text}"`);
  }

  /**
   * Wait for URL pattern
   * @param {string | RegExp} urlPattern 
   * @param {number} [timeout=10000]
   * @returns {Promise<void>}
   */
  async waitForURL(urlPattern, timeout = 10000) {
    await this.page.waitForURL(urlPattern, { timeout });
    logger.info(`[Wrapper] ⏳ Wait for URL: ${urlPattern}`);
  }

  /**
   * Check if element is visible
   * @param {string} selector 
   * @param {number} [timeout=5000]
   * @returns {Promise<boolean>}
   */
  async isVisible(selector, timeout = 5000) {
    return this.page.locator(selector).isVisible({ timeout }).catch(() => false);
  }

  /**
   * Check if element is enabled
   * @param {string} selector 
   * @param {number} [timeout=5000]
   * @returns {Promise<boolean>}
   */
  async isEnabled(selector, timeout = 5000) {
    return this.page.locator(selector).isEnabled({ timeout }).catch(() => false);
  }

  /**
   * Get text content
   * @param {string} selector 
   * @returns {Promise<string>}
   */
  async getText(selector) {
    return (await this.page.locator(selector).textContent()) || '';
  }

  /**
   * Get current URL
   * @returns {string}
   */
  getURL() {
    return this.page.url();
  }

  /**
   * Dismiss element if present (e.g., cookie banner, modal)
   * @param {string} selector 
   * @param {string} [elementName]
   * @returns {Promise<void>}
   */
  async dismissIfPresent(selector, elementName) {
    const name = elementName || selector;
    try {
      const el = this.page.locator(selector);
      if (await el.isVisible({ timeout: 3000 })) {
        await el.click();
        logger.info(`[Wrapper] ❌ Dismissed: ${name}`);
      }
    } catch {
      logger.debug(`[Wrapper] Element not present (skipped): ${name}`);
    }
  }

  /**
   * Take screenshot
   * @param {string} name 
   * @param {{ fullPage?: boolean }} [options]
   * @returns {Promise<Buffer>}
   */
  async screenshot(name, options = {}) {
    const screenshot = await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: options.fullPage || false
    });
    logger.info(`[Wrapper] 📸 Screenshot: ${name}`);
    return screenshot;
  }

  /**
   * Press keyboard key
   * @param {string} key - e.g., 'Enter', 'Escape', 'ArrowDown'
   * @returns {Promise<void>}
   */
  async pressKey(key) {
    await this.page.keyboard.press(key);
    logger.info(`[Wrapper] ⌨️  Press key: ${key}`);
  }

  /**
   * Hover over element
   * @param {string} selector 
   * @param {string} [elementName]
   * @returns {Promise<void>}
   */
  async hover(selector, elementName) {
    const name = elementName || selector;
    const locator = this.page.locator(selector);
    
    await this.healer.executeWithHealing(name, locator, async (loc) => {
      await loc.hover({ timeout: 5000 });
    });
    
    logger.info(`[Wrapper] 🎯 Hover: ${name}`);
  }

  /**
   * Reload page
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<void>}
   */
  async reload(options = {}) {
    await this.page.reload(options);
    logger.info('[Wrapper] 🔄 Page reloaded');
  }

  /**
   * Go back
   * @returns {Promise<void>}
   */
  async goBack() {
    await this.page.goBack();
    logger.info('[Wrapper] ⬅️  Navigate back');
  }

  /**
   * Get page title
   * @returns {Promise<string>}
   */
  async getTitle() {
    return await this.page.title();
  }
}

module.exports = { PlaywrightWrapper };