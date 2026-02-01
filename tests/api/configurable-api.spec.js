const { test, expect } = require('../../fixtures/test-fixtures');
const { APIClient } = require('../../utils/api-client');
const { logger } = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * CONFIGURABLE API Test Suite
 * This test reads endpoints from test-data/api-endpoints.json
 * REPLACE the endpoints in that file with YOUR actual API!
 */

// Load endpoint configuration
const endpointConfigPath = path.join(process.cwd(), 'test-data', 'api-endpoints.json');
/** @type {any} */
let endpointConfig;

try {
  const configFile = fs.readFileSync(endpointConfigPath, 'utf-8');
  endpointConfig = JSON.parse(configFile);
  logger.info(`✅ Loaded endpoint configuration from: ${endpointConfigPath}`);
} catch (error) {
  logger.error(`❌ Failed to load endpoint configuration: ${error}`);
  endpointConfig = {
    baseURL: 'https://jsonplaceholder.typicode.com',
    endpoints: {
      posts: {
        list: {
          method: 'GET',
          path: '/posts',
          expectedStatus: 200,
        },
      },
    },
  };
}

test.describe('TC_1: HTTP API with Status Code 200 Validation', () => {
  /** @type {APIClient} */
  let apiClient;

  test.beforeAll(async () => {
    logger.info('========================================');
    logger.info('🚀 TEST SUITE: Configurable API Tests');
    logger.info(`📍 Base URL: ${endpointConfig.baseURL}`);
    logger.info('========================================\n');

    apiClient = new APIClient(endpointConfig.baseURL);
    await apiClient.init();
  });

  test.afterAll(async () => {
    await apiClient.dispose();
    logger.info('\n========================================');
    logger.info('✅ Test suite completed');
    logger.info('========================================');
  });

  /**
   * TC_API_001: GET Request - Status Code 200
   */
  test('TC_API_001: GET request should return status code 200', async () => {
    logger.info('\n📝 TC_API_001: Testing GET request for 200 status');
    logger.info('─────────────────────────────────────────────────');

    const endpoint = endpointConfig.endpoints.posts.list;

    logger.info(`Step 1: Sending ${endpoint.method} request to ${endpoint.path}`);
    const response = await apiClient.get(endpoint.path);

    logger.info(`Step 2: Validating response status code`);
    expect(response.status).toBe(endpoint.expectedStatus);
    logger.info(`✅ Status Code: ${response.status} (Expected: ${endpoint.expectedStatus})`);

    logger.info(`Step 3: Validating response body`);
    expect(response.body).toBeDefined();
    logger.info(`✅ Response body received`);

    logger.info(`Step 4: Validating response time`);
    logger.info(`⏱️  Response Time: ${response.responseTime}ms`);
    expect(response.responseTime).toBeLessThan(5000);

    logger.info('\n✨ TC_API_001: PASSED\n');
  });

  /**
   * TC_API_002: GET Single Resource - Status Code 200
   */
  test('TC_API_002: GET single resource should return 200', async () => {
    logger.info('\n📝 TC_API_002: Testing GET single resource');
    logger.info('─────────────────────────────────────────────────');

    const endpoint = endpointConfig.endpoints.posts.getById;
    const resourceId = 1;
    const fullPath = endpoint.path.replace('{id}', resourceId);

    logger.info(`Step 1: Sending ${endpoint.method} request to ${fullPath}`);
    const response = await apiClient.get(fullPath);

    logger.info(`Step 2: Validating status code`);
    expect(response.status).toBe(endpoint.expectedStatus);
    logger.info(`✅ Status Code: ${response.status}`);

    logger.info(`Step 3: Validating response contains resource data`);
    expect(response.body).toHaveProperty('id');
    logger.info(`✅ Resource ID: ${response.body.id}`);

    logger.info('\n✨ TC_API_002: PASSED\n');
  });

  /**
   * TC_API_003: POST Request - Create Resource
   */
  test('TC_API_003: POST request should create resource and return 201', async () => {
    logger.info('\n📝 TC_API_003: Testing POST request for resource creation');
    logger.info('─────────────────────────────────────────────────');

    const endpoint = endpointConfig.endpoints.posts.create;

    logger.info(`Step 1: Preparing request payload`);
    const payload = endpoint.payload;
    logger.info(`Payload: ${JSON.stringify(payload, null, 2)}`);

    logger.info(`Step 2: Sending ${endpoint.method} request to ${endpoint.path}`);
    const response = await apiClient.post(endpoint.path, payload);

    logger.info(`Step 3: Validating status code`);
    expect(response.status).toBe(endpoint.expectedStatus);
    logger.info(`✅ Status Code: ${response.status} (Expected: ${endpoint.expectedStatus})`);

    logger.info(`Step 4: Validating response contains created resource`);
    expect(response.body).toHaveProperty('id');
    logger.info(`✅ Created Resource ID: ${response.body.id}`);

    logger.info('\n✨ TC_API_003: PASSED\n');
  });
});

/**
 * INSTRUCTIONS TO USE THIS TEST:
 * 
 * 1. Edit test-data/api-endpoints.json
 * 2. Replace baseURL with YOUR API base URL
 * 3. Update endpoints with YOUR actual API endpoints
 * 4. Run: npm test -- tests/api/configurable-api.spec.js
 * 
 * The test will automatically use your configured endpoints!
 */