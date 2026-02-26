const { chromium } = require('@playwright/test');
const { logger } = require('../../utils/base/logger');
const path = require('path');

/**
 * ============================================================================
 * API EXECUTOR - Execute API Calls and Capture Responses
 * ============================================================================
 * 
 * Executes API calls using the generated helper methods and captures
 * the actual response for OpenAPI generation.
 * 
 * Uses Playwright's request context to make API calls, similar to how
 * tests use the apiClient fixture.
 * 
 * USAGE:
 * ------
 * ```javascript
 * const executor = new ApiExecutor();
 * const result = await executor.executeApi({
 *   serviceName: 'payment-service',
 *   helperClass: 'PaymentHelper',
 *   methodName: 'processPayment',
 *   payload: { amount: 100 },
 *   parsedRequest: { url: '/v1/payments', method: 'POST', ... }
 * });
 * ```
 * ============================================================================
 */

class ApiExecutor {
  constructor() {
    this.context = null;
  }

  /**
   * Execute API call using generated helper method
   * @param {Object} options
   * @param {string} options.serviceName - Service name
   * @param {string} options.helperClass - Helper class name (e.g., 'PaymentHelper')
   * @param {string} options.methodName - Method name (e.g., 'processPayment')
   * @param {Object} options.payload - Request payload
   * @param {Object} options.parsedRequest - Original parsed request
   * @returns {Promise<Object>} Execution result with response data
   */
  async executeApi(options) {
    const { serviceName, helperClass, methodName, payload, parsedRequest } = options;

    try {
      // 1. Load the helper class
      const helperPath = path.resolve(
        __dirname,
        `../../services/${serviceName}/${serviceName}-helper.js`
      );
      
      logger.info(`  Loading helper: ${helperPath}`);
      const HelperModule = require(helperPath);
      const HelperClass = HelperModule[helperClass];

      if (!HelperClass) {
        throw new Error(`Helper class ${helperClass} not found in ${helperPath}`);
      }

      if (typeof HelperClass[methodName] !== 'function') {
        throw new Error(`Method ${methodName} not found in ${helperClass}`);
      }

      // 2. Create Playwright request context
      logger.info('  Creating Playwright request context...');
      const apiContext = await this._createApiContext(parsedRequest);

      // 3. Execute the API call
      logger.info(`  Executing: ${helperClass}.${methodName}()`);
      const startTime = Date.now();
      
      const response = await HelperClass[methodName](apiContext, payload);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // 4. Extract response data
      const responseData = await this._extractResponseData(response, responseTime);

      // 5. Close context
      await this._closeApiContext();

      // 6. Return execution result
      return {
        request: parsedRequest,
        response: responseData
      };

    } catch (error) {
      logger.error(`  ❌ API execution failed: ${error.message}`);
      await this._closeApiContext();
      throw error;
    }
  }

  /**
   * Create Playwright API request context
   * @private
   */
  async _createApiContext(parsedRequest) {
    // Extract base URL from parsed request
    const baseURL = this._extractBaseUrl(parsedRequest.url);

    logger.info(`  Base URL: ${baseURL}`);

    // Create browser context with API capabilities
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      baseURL: baseURL,
      extraHTTPHeaders: parsedRequest.headers || {}
    });

    // Store context for cleanup
    this.context = context;
    this.browser = browser;

    // Return request context
    return context.request;
  }

  /**
   * Extract base URL from full URL
   * @private
   */
  _extractBaseUrl(url) {
    // If URL is relative, return empty (will need to be configured)
    if (url.startsWith('/')) {
      // Try to load from service config or environment
      return process.env.API_BASE_URL || 'http://localhost:3000';
    }

    // If URL is absolute, extract base
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch (error) {
      logger.warn(`  Could not parse URL: ${url}, using default`);
      return process.env.API_BASE_URL || 'http://localhost:3000';
    }
  }

  /**
   * Extract response data from Playwright response
   * @private
   */
  async _extractResponseData(response, responseTime) {
    const status = response.status();
    const headers = response.headers();
    
    // Try to parse body as JSON
    let body;
    try {
      body = await response.json();
    } catch (error) {
      // If not JSON, get text
      try {
        body = await response.text();
      } catch (textError) {
        body = null;
      }
    }

    return {
      status,
      headers,
      body,
      time: responseTime,
      statusText: response.statusText(),
      ok: response.ok()
    };
  }

  /**
   * Close API context
   * @private
   */
  async _closeApiContext() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = { ApiExecutor };