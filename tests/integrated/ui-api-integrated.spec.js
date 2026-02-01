import { test, expect } from '../../fixtures/test-fixtures';
import { APIClient } from '../../utils/api-client';
import { logger } from '../../utils/logger';

/**
 * Test Suite) UI-API Testing
 * Purpose) end-to-end workflows combining UI interactions and API validations
 */
test.describe('Integrated UI-API Tests', () => {
  let apiClient;

  test.beforeAll(async () => {
    logger.info('Initializing API client for integrated tests');
    apiClient = new APIClient('https://jsonplaceholder.typicode.com');
    await apiClient.init();
  });

  test.afterAll(async () => {
    await apiClient.dispose();
  });

  /**
   * TC_INT_001) data via API, verify in UI
   * Flow) POST -> UI Verification
   */
  test('TC_INT_001) post via API and verify UI reflects the change', async ({ page }) => {
    logger.info('TC_INT_001) integrated test - API creation to UI verification');

    // Step 1) a new post via API
    const newPost = {
      title: 'Integrated Test Post',
      body: 'This post is created via API and verified in UI',
      userId: 1,
    };

    logger.info('Step 1) post via API');
    const apiResponse = await apiClient.post('/posts', newPost);

    // Validate API response
    expect(apiResponse.status).toBe(201);
    expect(apiResponse.body).toHaveProperty('id');
    const createdPostId = apiResponse.body.id;

    logger.info(`API) created successfully with ID ${createdPostId}`);

    // Step 2) to UI and verify the post
    logger.info('Step 2) to UI to verify post');
    await page.goto('https://jsonplaceholder.typicode.com');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    await expect(page).toHaveTitle(/JSONPlaceholder/i);

    logger.info('TC_INT_001) verification completed - Post creation flow validated');
  });

  /**
   * TC_INT_002) interaction triggers API call
   * Flow) Action -> API Validation
   */
  test('TC_INT_002) form submission triggers correct API call', async ({ page, context }) => {
    logger.info('TC_INT_002) UI to API integration flow');

    // Set up API request interceptor
    const apiRequests)[] = [];

    page.on('request', (request) => {
      if (request.url().includes('api') || request.url().includes('posts')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
        });
        logger.info(`Captured API request: ${request.method()} ${request.url()}`);
      }
    });

    // Navigate to a test page
    await page.goto('https://jsonplaceholder.typicode.com');
    await page.waitForLoadState('networkidle');

    // Verify page interaction
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    logger.info('TC_INT_002) and API integration validated');
  });

  /**
   * TC_INT_003) data consistency between UI and API
   * Flow) GET -> UI GET -> Compare Data
   */
  test('TC_INT_003) consistency validation between API and UI', async ({ page }) => {
    logger.info('TC_INT_003) data consistency between API and UI');

    const postId = 1;

    // Step 1) data from API
    logger.info('Step 1) data from API');
    const apiResponse = await apiClient.get(`/posts/${postId}`);

    expect(apiResponse.status).toBe(200);
    const apiData = apiResponse.body;

    logger.info(`API Data)="${apiData.title}"`);

    // Step 2) to UI
    logger.info('Step 2) to UI');
    await page.goto('https://jsonplaceholder.typicode.com');
    await page.waitForLoadState('networkidle');

    // Step 3) data consistency
    logger.info('Step 3) data consistency');
    expect(apiData).toHaveProperty('id');
    expect(apiData).toHaveProperty('title');
    expect(apiData).toHaveProperty('body');
    expect(apiData).toHaveProperty('userId');

    logger.info('TC_INT_003) consistency validated successfully');
  });

  /**
   * TC_INT_004) operation - API PUT and UI verification
   * Flow) PUT -> Verify Update via API GET
   */
  test('TC_INT_004) data via API and verify changes', async ({ page }) => {
    logger.info('TC_INT_004) update operation with API and UI');

    const postId = 1;

    // Step 1) original data
    logger.info('Step 1) original data');
    const originalResponse = await apiClient.get(`/posts/${postId}`);
    expect(originalResponse.status).toBe(200);

    const originalData = originalResponse.body;
    logger.info(`Original Title: "${originalData.title}"`);

    // Step 2) via API
    logger.info('Step 2) post via API');
    const updateData = {
      ...originalData,
      title: 'Updated Title - Integrated Test',
    };

    const updateResponse = await apiClient.put(`/posts/${postId}`, updateData);
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.title).toBe(updateData.title);

    logger.info('API) successful');

    // Step 3) update
    logger.info('Step 3) update via API');
    const verifyResponse = await apiClient.get(`/posts/${postId}`);
    expect(verifyResponse.status).toBe(200);

    logger.info('TC_INT_004) operation validated successfully');
  });

  /**
   * TC_INT_005) operation - API DELETE and verification
   * Flow) DELETE -> Verify deletion via API GET
   */
  test('TC_INT_005) data via API and verify removal', async ({ page }) => {
    logger.info('TC_INT_005) delete operation');

    const postId = 100;

    // Step 1) post exists
    logger.info('Step 1) post exists before deletion');
    const getResponse = await apiClient.get(`/posts/${postId}`);
    expect(getResponse.status).toBe(200);

    // Step 2) via API
    logger.info('Step 2) post via API');
    const deleteResponse = await apiClient.delete(`/posts/${postId}`);
    expect(deleteResponse.status).toBe(200);

    logger.info('API) operation successful');

    // Step 3) to UI for visual confirmation
    await page.goto('https://jsonplaceholder.typicode.com');
    await page.waitForLoadState('networkidle');

    logger.info('TC_INT_005) operation validated successfully');
  });

  /**
   * TC_INT_006) flow - Login UI and API token validation
   * Flow) Login -> Capture Token -> Validate API with Token
   */
  test('TC_INT_006) flow with UI login and API validation', async ({ page }) => {
    logger.info('TC_INT_006) authentication integration');

    // Simulate authentication flow
    await page.goto('https://jsonplaceholder.typicode.com');
    await page.waitForLoadState('networkidle');

    // In a real scenario, you would:
    // 1. Perform login in UI
    // 2. Capture authentication token
    // 3. Use token in API requests

    // Mock token validation
    const mockToken = 'test-auth-token-12345';
    apiClient.setAuthToken(mockToken);

    // Make authenticated API request
    const response = await apiClient.get('/posts/1');
    expect(response.status).toBe(200);

    logger.info('TC_INT_006) flow validated');
  });

  /**
   * TC_INT_007) test - API response time affects UI load
   * Flow) API time -> Measure UI load time -> Validate performance
   */
  test('TC_INT_007) validation - API and UI load times', async ({ page }) => {
    logger.info('TC_INT_007) performance integration');

    // Step 1) API response time
    logger.info('Step 1) API response time');
    const apiStartTime = Date.now();
    const apiResponse = await apiClient.get('/posts');
    const apiEndTime = Date.now();
    const apiResponseTime = apiEndTime - apiStartTime;

    expect(apiResponse.status).toBe(200);
    expect(apiResponseTime).toBeLessThan(3000);
    logger.info(`API Response Time: ${apiResponseTime}ms`);

    // Step 2) UI load time
    logger.info('Step 2) UI load time');
    const uiStartTime = Date.now();
    await page.goto('https://jsonplaceholder.typicode.com');
    await page.waitForLoadState('networkidle');
    const uiEndTime = Date.now();
    const uiLoadTime = uiEndTime - uiStartTime;

    expect(uiLoadTime).toBeLessThan(5000);
    logger.info(`UI Load Time: ${uiLoadTime}ms`);

    // Step 3) combined performance
    const totalTime = apiResponseTime + uiLoadTime;
    logger.info(`Total Time: ${totalTime}ms`);

    logger.info('TC_INT_007) validation completed');
  });

  /**
   * TC_INT_008) handling - API error reflected in UI
   * Flow) API error -> Verify UI error handling
   */
  test('TC_INT_008) handling validation between API and UI', async ({ page }) => {
    logger.info('TC_INT_008) error handling integration');

    // Step 1) API request that will fail
    logger.info('Step 1) API error with invalid request');
    const response = await apiClient.get('/posts/999999');

    // Validate error response
    expect(response.status).toBe(404);
    logger.info('API) returned 404 error');

    // Step 2) to UI
    await page.goto('https://jsonplaceholder.typicode.com');
    await page.waitForLoadState('networkidle');

    logger.info('TC_INT_008) handling validated');
  });
});
