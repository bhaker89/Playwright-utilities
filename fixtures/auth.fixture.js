const { test as base } = require('@playwright/test');
const { AuthHelper } = require('../utils/auth-helper');
const { logger } = require('../utils/logger');
const { env } = require('../config/environment.config');
const path = require('path');
const fs = require('fs');

/**
 * @typedef {Object} AuthFixtures
 * @property {import('@playwright/test').Page} authenticatedPage
 * @property {import('@playwright/test').BrowserContext} authenticatedContext
 */

const authFile = path.join(__dirname, '../.auth/user.json');

const test = base.extend({
  /**
   * @param {{ browser: import('@playwright/test').Browser }} params
   * @param {(context: import('@playwright/test').BrowserContext) => Promise<void>} use
   */
  authenticatedContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    
    if (fs.existsSync(authFile)) {
      logger.info('Loading cached auth state');
      await context.addCookies(JSON.parse(fs.readFileSync(authFile, 'utf-8')).cookies);
    } else {
      logger.info('No cached auth found, performing login');
      const page = await context.newPage();
      const authHelper = new AuthHelper(page);
      
      await authHelper.loginWithOTP(env.authUsername, '123456');
      
      const cookies = await context.cookies();
      fs.mkdirSync(path.dirname(authFile), { recursive: true });
      fs.writeFileSync(authFile, JSON.stringify({ cookies }));
      logger.info('Auth state cached');
      
      await page.close();
    }
    
    await use(context);
    await context.close();
  },
  
  /**
   * @param {{ authenticatedContext: import('@playwright/test').BrowserContext }} params
   * @param {(page: import('@playwright/test').Page) => Promise<void>} use
   */
  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
    await page.close();
  },
});

const { expect } = require('@playwright/test');

module.exports = { test, expect };