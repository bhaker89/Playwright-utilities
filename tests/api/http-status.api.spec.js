const { test, expect } = require('../../fixtures/test-fixtures');
const { APIClient } = require('../../utils/api-client');
const { logger } = require('../../utils/logger');

/**
 * Test Suite: HTTP API Status Code Validation
 * Purpose: Validate HTTP endpoints return expected 200 status codes
 */
test.describe('HTTP API - Status Code 200 Validation', () => {
  /** @type {APIClient} */
  let apiClient;

  test.beforeAll(async () => {
    logger.info('Initializing API client for HTTP status tests');
    apiClient = new APIClient('https://jsonplaceholder.typicode.com');
    await apiClient.init();
  });

  test.afterAll(async () => {
    await apiClient.dispose();
    logger.info('API client disposed after HTTP status tests');
  });

  /**
   * TC_API_001: Positive Test - GET request returns 200 status code
   */
  test('TC_API_001: GET /posts - should return status code 200', async () => {
    logger.info('TC_API_001: Testing GET request for 200 status code');

    // Execute API request
    const response = await apiClient.get('/posts');

    // Assertions
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.responseTime).toBeLessThan(5000);

    logger.info(`TC_API_001: Response received with status ${response.status} in ${response.responseTime}ms`);
  });

  /**
   * TC_API_002: Positive Test - GET single resource returns 200
   */
  test('TC_API_002: GET /posts/:id - should return status code 200 for valid ID', async () => {
    logger.info('TC_API_002: Testing GET request with valid resource ID');

    const postId = 1;
    const response = await apiClient.get(`/posts/${postId}`);

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.id).toBe(postId);
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('body');
    expect(response.body).toHaveProperty('userId');

    logger.info(`TC_API_002: Successfully retrieved post with ID ${postId}`);
  });

  /**
   * TC_API_003: Positive Test - GET with query parameters returns 200
   */
  test('TC_API_003: GET /posts with query params - should return status code 200', async () => {
    logger.info('TC_API_003: Testing GET request with query parameters');

    const response = await apiClient.get('/posts', {
      params: { userId: 1 },
    });

    // Assertions
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.every((post) => post.userId === 1)).toBeTruthy();

    logger.info(`TC_API_003: Retrieved ${response.body.length} posts for userId 1`);
  });

  /**
   * TC_API_004: Positive Test - POST request returns 201 (successful creation)
   */
  test('TC_API_004: POST /posts - should return status code 201', async () => {
    logger.info('TC_API_004: Testing POST request for resource creation');

    const newPost = {
      title: 'Automated Test Post',
      body: 'This is a test post created by automation framework',
      userId: 1,
    };

    const response = await apiClient.post('/posts', newPost);

    // Assertions
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(newPost.title);
    expect(response.body.body).toBe(newPost.body);
    expect(response.body.userId).toBe(newPost.userId);

    logger.info(`TC_API_004: Successfully created post with ID ${response.body.id}`);
  });

  /**
   * TC_API_005: Boundary Test - GET request with boundary value ID
   */
  test('TC_API_005: GET /posts/:id - should return 200 for boundary value ID', async () => {
    logger.info('TC_API_005: Testing boundary value - maximum valid ID');

    const response = await apiClient.get('/posts/100');

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(100);

    logger.info('TC_API_005: Successfully retrieved post with boundary ID');
  });

  /**
   * TC_API_006: Negative Test - GET request with invalid ID returns 404
   */
  test('TC_API_006: GET /posts/:id - should return 404 for invalid ID', async () => {
    logger.info('TC_API_006: Testing negative scenario with invalid ID');

    const response = await apiClient.get('/posts/99999');

    // Assertions
    expect(response.status).toBe(404);

    logger.info('TC_API_006: Correctly received 404 for invalid resource ID');
  });

  /**
   * TC_API_007: Performance Test - Response time validation
   */
  test('TC_API_007: GET /posts - response time should be acceptable', async () => {
    logger.info('TC_API_007: Testing API response time performance');

    const response = await apiClient.get('/posts');

    // Assertions
    expect(response.status).toBe(200);
    expect(response.responseTime).toBeLessThan(3000);

    logger.info(`TC_API_007: Response time: ${response.responseTime}ms (acceptable)`);
  });
});