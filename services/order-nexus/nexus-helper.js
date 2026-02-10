const { logger } = require('../../utils/base/logger');
const { SchemaValidator, OrderNexusSchemas } = require('../../utils/base/schema-validator');

/**
 * Order Nexus API Helper
 * Handles payload validation, API context setup, and common utilities
 */
class OrderNexusHelper {
  /**
   * Create API context with Order Nexus configuration
   * @param {Object} playwright - Playwright instance
   * @param {string} baseURL - Base URL for Order Nexus API
   * @param {string} token - Authorization token
   * @returns {Promise<APIRequestContext>}
   */
  static async createApiContext(playwright, baseURL, token) {
    logger.info('🔧 Creating API Context for Order Nexus...');

    const apiContext = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'X-API-Version': 'v1',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      timeout: 30000, // 30 seconds timeout
    });

    logger.info('✅ API Context initialized successfully\n');
    return apiContext;
  }

  /**
   * Create unauthenticated API context for testing auth failures
   * @param {Object} playwright - Playwright instance
   * @param {string} baseURL - Base URL for Order Nexus API
   * @returns {Promise<APIRequestContext>}
   */
  static async createUnauthenticatedContext(playwright, baseURL) {
    logger.info('🔧 Creating unauthenticated API Context...');

    const apiContext = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });

    return apiContext;
  }

  /**
   * Validate payload against Order Nexus schema
   * @param {Object} payload - Payload to validate
   * @throws {Error} If validation fails
   */
  static validatePayload(payload) {
    logger.info('🔍 Validating request payload against schema...');

    const validation = SchemaValidator.validate(
      payload,
      OrderNexusSchemas.createOrderRequestPayload
    );

    if (!validation.isValid) {
      logger.error('❌ Payload validation failed:', validation.errors);
      throw new Error(`Invalid payload: ${validation.errors?.join(', ')}`);
    }

    logger.info('✅ Payload validation passed');
    return validation;
  }

  /**
   * Validate response against Order Nexus schema
   * @param {Object} responseBody - Response body to validate
   * @throws {Error} If validation fails
   */
  static validateResponse(responseBody) {
    logger.info('🔍 Validating response against schema...');

    const validation = SchemaValidator.validate(
      responseBody,
      OrderNexusSchemas.createOrUpdateOrderResponse
    );

    if (!validation.isValid) {
      logger.error('❌ Schema validation failed:', validation.errors);
      throw new Error(`Schema validation failed: ${validation.errors?.join(', ')}`);
    }

    logger.info('✅ Response schema validation passed');
    return validation;
  }

  /**
   * Log test suite initialization info
   * @param {string} env - Environment name
   * @param {string} baseURL - Base URL
   * @param {string} endpoint - API endpoint
   */
  static logTestSuiteInit(env, baseURL, endpoint) {
    const fullUrl = `${baseURL}${endpoint}`;

    logger.info('\n========================================');
    logger.info('🚀 TEST SUITE: Order Nexus API - Staging');
    logger.info('========================================');
    logger.info(`Environment: ${env}`);
    logger.info(`Base URL: ${baseURL}`);
    logger.info(`Endpoint: ${endpoint}`);
    logger.info(`Full URL: ${fullUrl}`);
    logger.info('========================================\n');
  }

  /**
   * Log test case header
   * @param {string} testId - Test case ID
   * @param {string} title - Test title
   * @param {string} objective - Test objective
   * @param {Array<string>} validations - List of validations
   */
  static logTestCaseHeader(testId, title, objective, validations = []) {
    logger.info(`\n📝 ${testId}: ${title}`);
    logger.info('─'.repeat(60));
    logger.info(`OBJECTIVE: ${objective}`);

    if (validations.length > 0) {
      logger.info('VALIDATIONS:');
      validations.forEach(validation => {
        logger.info(`  ✓ ${validation}`);
      });
    }

    logger.info('─'.repeat(60) + '\n');
  }

  /**
   * Log test phase
   * @param {number} phase - Phase number
   * @param {string} title - Phase title
   */
  static logPhase(phase, title) {
    logger.info(`\nPHASE ${phase}: ${title}`);
    logger.info('─'.repeat(60));
  }

  /**
   * Log test summary
   * @param {string} testId - Test case ID
   * @param {Object} results - Test results object
   */
  static logTestSummary(testId, results) {
    logger.info('\n' + '═'.repeat(60));
    logger.info(`✨ ${testId}: ALL VALIDATIONS PASSED ✨`);
    logger.info('═'.repeat(60));
    logger.info('Summary:');

    Object.entries(results).forEach(([key, value]) => {
      logger.info(`  ✓ ${key}: ${JSON.stringify(value)}`);
    });

    logger.info('═'.repeat(60) + '\n');
  }

  /**
   * Make POST request with timing
   * @param {APIRequestContext} apiContext - API context
   * @param {string} endpoint - API endpoint
   * @param {Object} payload - Request payload
   * @returns {Promise<{response: Object, responseTime: number}>}
   */
  static async makePostRequest(apiContext, endpoint, payload) {
    logger.info(`📤 Sending POST request to ${endpoint}...`);

    const startTime = Date.now();
    const response = await apiContext.post(endpoint, {
      data: payload,
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    logger.info(`✅ Request completed in ${responseTime}ms`);
    logger.info(`Response Status: ${response.status()} ${response.statusText()}\n`);

    return { response, responseTime };
  }

  /**
   * Validate response headers
   * @param {Object} headers - Response headers
   */
  static validateHeaders(headers) {
    logger.info('📋 Validating response headers...');
    logger.info('Response Headers:');

    Object.entries(headers).forEach(([key, value]) => {
      logger.info(`  ${key}: ${value}`);
    });

    // Return content-type for further validation
    return headers['content-type'];
  }

  /**
   * Parse and log response body
   * @param {Object} response - Response object
   * @returns {Promise<Object>} Parsed response body
   */
  static async parseResponseBody(response) {
    logger.info('📦 Parsing response body...');
    const responseBody = await response.json();

    logger.info('Response Body:');
    logger.info(JSON.stringify(responseBody, null, 2));

    return responseBody;
  }

  /**
   * Check if token is configured
   * @param {string} token - Authorization token
   */
  static checkTokenConfiguration(token) {
    if (!token) {
      logger.warn('⚠️  WARNING: ORDER_NEXUS_TOKEN is not set!');
      logger.warn('Please set it in config/.env.stag file');
    }
  }

  /**
   * Cleanup API context
   * @param {APIRequestContext} apiContext - API context to dispose
   */
  static async cleanup(apiContext) {
    await apiContext.dispose();
    logger.info('\n✅ API Context disposed');
    logger.info('========================================\n');
  }
}

module.exports = { OrderNexusHelper };