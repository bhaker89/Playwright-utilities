const playwrightTest = require('@playwright/test');
const base = playwrightTest.test;
const { APIClient } = require('../utils/api/api-client');
const { APIClientFactory } = require('../utils/api/multi-service-api-client');
const { logger } = require('../utils/base/logger');
const { env } = require('../config/environment.config');
const { SharedTestContext } = require('../platform/core/shared-test-context');
const { LoginPage } = require('../pages/login.page');
const { OrderNexusHelper } = require('../services/order-nexus/nexus-helper');

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
   * Now wraps Playwright's native 'request' context.
   * Inherits 'storageState' (auth) automatically from the config.
   */
  apiClient: async ({ request }, use) => {
    // We pass the native request context into our custom wrapper
    const client = new APIClient(request);

    logger.info('API client initialized with native request context');
    await use(client);
    // No explicit dispose needed, Playwright manages the context life-cycle
  },

  /**
   * Shared Test Context fixture
   * Provides access to the singleton SharedTestContext instance
   * Automatically clears test-scoped context after each test
   */
  sharedContext: async ({ }, use, testInfo) => {
    const context = SharedTestContext.getInstance();

    // Set test and suite names for scoped context tracking
    context.setSuiteName(testInfo.titlePath[0]);
    context.setTestName(testInfo.title);

    logger.info(`SharedContext provided for: ${testInfo.title}`);
    await use(context);

    // Clean up test-specific data to avoid leakage
    context.clearScope('test');
    logger.info(`SharedContext test scope cleaned for: ${testInfo.title}`);
  },

  /**
   * Multi-Service API Client Factory fixture
   * Allows creating authenticated clients for any service defined in services.config.js
   * @example
   * test('test', async ({ getServiceClient }) => {
   *   const userService = getServiceClient('user-service');
   *   await userService.get('/profile');
   * });
   */
  getServiceClient: async ({ request }, use) => {
    const factory = (serviceName) => APIClientFactory.createClient(serviceName, request);
    await use(factory);
  },

  /**
   * Order Nexus API Helper fixture
   * Provides a pre-configured helper for Order Nexus interactions.
   */
  nexus: async ({ request }, use) => {
    const helper = {
      context: request, // Use the unified request context
      validatePayload: (p) => OrderNexusHelper.validatePayload(p),
      validateResponse: (r) => OrderNexusHelper.validateResponse(r),
      createOrder: (payload) => OrderNexusHelper.makePostRequest(
        request,
        '/order_nexus/v1/orders/create_or_update_order',
        payload
      )
    };
    await use(helper);
  },

  /**
   * UI Engine Fixture (Legacy No-Code support)
   */
  ui: async ({ page }, use) => {
    const { UIEngine } = require('../platform/engines/ui-engine');
    const uiEngine = new UIEngine(page);
    await use(uiEngine);
  },

  /**
   * LoginPage Object fixture
   * Provides a pre-authenticated or ready-to-login UI object.
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

const expect = playwrightTest.expect;

/**
 * Re-export SharedTestContext utilities
 */
const { ContextHelpers } = require('../platform/core/shared-test-context');

module.exports = {
  test,
  expect,
  logger,
  SharedTestContext,
  ContextHelpers,
  APIClientFactory // Exported for manual factory usage if needed
};