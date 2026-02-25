const playwrightTest = require('@playwright/test');
const base = playwrightTest.test;
const { APIClient } = require('../utils/api-client');
const { logger } = require('../utils/logger');
const { env } = require('../config/environment.config');
const { SharedTestContext } = require('../utils/shared-test-context');

/**
 * ============================================================================
 * UNIFIED BASE TEST - For ALL Test Types
 * ============================================================================
 * 
 * This single base test provides fixtures and hooks for:
 * ✅ UI Tests (uses `page`)
 * ✅ API Tests (uses `apiClient`)
 * ✅ Integrated Tests (uses both `page` and `apiClient`)
 * ✅ Shared Context (uses `sharedContext`) - Share data between tests
 * 
 * WHY ONE BASE TEST?
 * ------------------
 * 1. DRY Principle - No code duplication
 * 2. Flexibility - Use what you need, ignore the rest
 * 3. Maintainability - Update hooks in ONE place
 * 4. Playwright's lazy fixtures - Unused fixtures don't impact performance
 * 
 * USAGE:
 * ------
 * ```javascript
 * const { test, expect } = require('../fixtures/base-test');
 * 
 * // UI Test - uses page
 * test('UI test', async ({ page }) => { ... });
 * 
 * // API Test - uses apiClient
 * test('API test', async ({ apiClient }) => { ... });
 * 
 * // Integrated Test - uses both + shared context
 * test('Create via API, verify in UI', async ({ page, apiClient, sharedContext }) => {
 *   // API: Create user
 *   const response = await apiClient.post('/users', userData);
 *   sharedContext.set('userId', response.body.id);
 *   
 *   // UI: Verify user appears
 *   const userId = sharedContext.get('userId');
 *   await page.goto(`/users/${userId}`);
 *   await expect(page.locator('.user-name')).toBeVisible();
 * });
 * ```
 * ============================================================================
 */

/**
 * Extended test with custom fixtures
 * 
 * @typedef {Object} TestFixtures
 * @property {import('../utils/api-client').APIClient} apiClient - API client for REST testing
 * @property {import('../utils/shared-test-context').SharedTestContext} sharedContext - Shared test context for data sharing
 */

/**
 * Extended test with custom fixtures
 */
const test = base.extend({
  /**
   * API Client fixture
   * Automatically initializes and disposes the API client
   */
  apiClient: async ({}, use) => {
    const client = new APIClient(env.apiBaseURL);
    await client.init();
    logger.info('API client initialized');
    
    await use(client);
    
    await client.dispose();
    logger.info('API client disposed');
  },

  /**
   * Shared Test Context fixture
   * Provides access to the singleton SharedTestContext instance
   * Automatically clears test-scoped context after each test
   */
  sharedContext: async ({}, use, testInfo) => {
    const context = SharedTestContext.getInstance();
    
    // Set test and suite names for scoped context
    context.setSuiteName(testInfo.titlePath[0]);
    context.setTestName(testInfo.title);
    
    logger.info(`SharedContext available for test: ${testInfo.title}`);
    
    await use(context);
    
    // Clear test-scoped context after each test
    context.clearScope('test');
    logger.info(`SharedContext test scope cleared for: ${testInfo.title}`);
  },
});

/**
 * Re-export expect for convenience
 */
const expect = playwrightTest.expect;

/**
 * Re-export SharedTestContext utilities
 */
const { ContextHelpers } = require('../utils/shared-test-context');

module.exports = {
  test,
  expect,
  logger,
  SharedTestContext,
  ContextHelpers
};