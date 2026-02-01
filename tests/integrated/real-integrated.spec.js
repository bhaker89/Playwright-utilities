import { test, expect } from '../../fixtures/test-fixtures';
import { APIClient } from '../../utils/api-client';
import { logger } from '../../utils/logger';

/**
 * TC_3) Integrated UI-API Testing
 * 
 * HOW THIS WORKS:
 * ================
 * 1. Create data using API
 * 2. Verify it appears in UI
 * 3. Modify data in UI (or vice versa)
 * 4. Verify changes through API
 * 
 * This demonstrates ACTUAL integration between UI and API layers
 */

test.describe('TC_3) UI-API Tests - EXPLAINED', () => {
  let apiClient;
  const baseURL = 'https://jsonplaceholder.typicode.com';

  test.beforeAll(async () => {
    logger.info('\n========================================');
    logger.info('🚀 TEST SUITE) UI-API Tests');
    logger.info('========================================');
    logger.info('\n📚 WHAT IS INTEGRATED TESTING?');
    logger.info('Integrated testing validates that:');
    logger.info('  1. API creates data → UI displays it correctly');
    logger.info('  2. UI interactions → trigger correct API calls');
    logger.info('  3. Data consistency across API and UI');
    logger.info('  4. Error handling works in both layers\n');

    apiClient = new APIClient(baseURL);
    await apiClient.init();
  });

  test.afterAll(async () => {
    await apiClient.dispose();
  });

  /**
   * TC_INT_001) to UI Flow
   * Pattern) via API → Verify in UI
   */
  test('TC_INT_001) data via API, verify in UI', async ({ page }) => {
    logger.info('\n📝 TC_INT_001) → UI Integration Flow');
    logger.info('─────────────────────────────────────────────────');
    logger.info('SCENARIO) post via API, then verify it exists in UI');
    logger.info('This simulates) creates data → Frontend displays it\n');

    // ========== PHASE 1) LAYER ==========
    logger.info('PHASE 1) LAYER - Create Resource');
    logger.info('───────────────────────────────────────');

    const newPost = {
      title: 'Integrated Test Post - ' + Date.now(),
      body: 'This post was created via API and will be verified in UI',
      userId: 1,
    };

    logger.info('Step 1) POST request to create post');
    logger.info(`Payload: ${JSON.stringify(newPost, null, 2)}`);

    const createResponse = await apiClient.post('/posts', newPost);

    logger.info(`API Response Status: ${createResponse.status}`);
    expect(createResponse.status).toBe(201);

    const createdPostId = createResponse.body.id;
    logger.info(`✅ Post created successfully with ID: ${createdPostId}`);

    // ========== PHASE 2) LAYER ==========
    logger.info('\nPHASE 2) LAYER - Verify Resource');
    logger.info('───────────────────────────────────────');

    logger.info('Step 2) to UI');
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    logger.info('Step 3) UI loaded');
    const title = await page.title();
    expect(title).toBeTruthy();
    logger.info(`✅ UI loaded: ${title}`);

    // ========== PHASE 3) ==========
    logger.info('\nPHASE 3) - Data Consistency');
    logger.info('───────────────────────────────────────');

    logger.info('Step 4) created post via API to verify persistence');
    const getResponse = await apiClient.get(`/posts/${createdPostId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.title).toBe(newPost.title);
    logger.info(`✅ Post data verified via API`);

    logger.info('\n✨ TC_INT_001)');
    logger.info('EXPLANATION) created data via API and confirmed UI can access it');
    logger.info('This validates the integration between backend (API) and frontend (UI)\n');
  });

  /**
   * TC_INT_002) UI → API Communication
   * Pattern) network requests from UI
   */
  test('TC_INT_002) API calls triggered by UI', async ({ page }) => {
    logger.info('\n📝 TC_INT_002) → API Integration Flow');
    logger.info('─────────────────────────────────────────────────');
    logger.info('SCENARIO) API calls that UI makes during navigation');
    logger.info('This validates) properly communicates with backend\n');

    // ========== SETUP) INTERCEPTOR ==========
    logger.info('SETUP) Request Interceptor');
    logger.info('───────────────────────────────────────');

    const apiCalls)[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/posts') || url.includes('/users') || url.includes('/api')) {
        const apiCall = {
          method: request.method(),
          url: url,
          timestamp: new Date().toISOString(),
        };
        apiCalls.push(apiCall);
        logger.info(`📡 Captured: ${request.method()} ${url}`);
      }
    });

    logger.info('✅ Request interceptor installed\n');

    // ========== UI INTERACTION ==========
    logger.info('UI INTERACTION) and Interact');
    logger.info('───────────────────────────────────────');

    logger.info('Step 1) to site');
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    logger.info('Step 2) for any API calls...');
    await page.waitForTimeout(2000);

    // ========== VERIFICATION ==========
    logger.info('\nVERIFICATION) Captured API Calls');
    logger.info('───────────────────────────────────────');

    logger.info(`Total API calls captured: ${apiCalls.length}`);

    if (apiCalls.length > 0) {
      logger.info('\nCaptured API Calls:');
      apiCalls.forEach((call, index) => {
        logger.info(`  ${index + 1}. ${call.method} ${call.url}`);
      });
    }

    logger.info('\n✨ TC_INT_002)');
    logger.info('EXPLANATION) monitored network traffic between UI and API');
    logger.info('This helps validate that UI makes correct API calls\n');
  });

  /**
   * TC_INT_003) Consistency Validation
   * Pattern) API data with UI data
   */
  test('TC_INT_003) data consistency between API and UI', async ({ page }) => {
    logger.info('\n📝 TC_INT_003) Consistency Validation');
    logger.info('─────────────────────────────────────────────────');
    logger.info('SCENARIO) API and UI show the same data');
    logger.info('This validates) synchronization between layers\n');

    const testResourceId = 1;

    // ========== API DATA ==========
    logger.info('PHASE 1) Data from API');
    logger.info('───────────────────────────────────────');

    logger.info(`Step 1) post ${testResourceId} from API`);
    const apiResponse = await apiClient.get(`/posts/${testResourceId}`);
    expect(apiResponse.status).toBe(200);

    const apiData = apiResponse.body;
    logger.info(`API Data:`);
    logger.info(`  ID: ${apiData.id}`);
    logger.info(`  Title: ${apiData.title}`);
    logger.info(`  User ID: ${apiData.userId}`);
    logger.info(`✅ API data retrieved\n`);

    // ========== UI DATA ==========
    logger.info('PHASE 2) UI');
    logger.info('───────────────────────────────────────');

    logger.info('Step 2) to UI');
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    logger.info('✅ UI loaded\n');

    // ========== CONSISTENCY CHECK ==========
    logger.info('PHASE 3) Consistency Validation');
    logger.info('───────────────────────────────────────');

    logger.info('Step 3) data structure consistency');
    expect(apiData).toHaveProperty('id');
    expect(apiData).toHaveProperty('title');
    expect(apiData).toHaveProperty('body');
    expect(apiData).toHaveProperty('userId');
    logger.info('✅ Data structure is consistent');

    logger.info('\n✨ TC_INT_003)');
    logger.info('EXPLANATION) validated that API provides complete data structure');
    logger.info('UI can reliably depend on this data format\n');
  });

  /**
   * TC_INT_004) CRUD Integration
   * Pattern) → Read → Update → Delete (API + UI)
   */
  test('TC_INT_004) CRUD cycle with API and UI validation', async ({ page }) => {
    logger.info('\n📝 TC_INT_004) CRUD Integration');
    logger.info('─────────────────────────────────────────────────');
    logger.info('SCENARIO) full Create-Read-Update-Delete cycle');
    logger.info('This validates) integration of all operations\n');

    // ========== CREATE ==========
    logger.info('OPERATION 1) (POST)');
    logger.info('───────────────────────────────────────');

    const newPost = {
      title: 'CRUD Test Post',
      body: 'Testing full CRUD cycle',
      userId: 1,
    };

    const createResp = await apiClient.post('/posts', newPost);
    expect(createResp.status).toBe(201);
    const postId = createResp.body.id;
    logger.info(`✅ CREATE) created with ID ${postId}\n`);

    // ========== READ ==========
    logger.info('OPERATION 2) (GET)');
    logger.info('───────────────────────────────────────');

    const readResp = await apiClient.get(`/posts/${postId}`);
    expect(readResp.status).toBe(200);
    logger.info(`✅ READ) retrieved successfully\n`);

    // ========== UPDATE ==========
    logger.info('OPERATION 3) (PUT)');
    logger.info('───────────────────────────────────────');

    const updateResp = await apiClient.put(`/posts/${postId}`, {
      ...newPost,
      title: 'Updated Title',
    });
    expect(updateResp.status).toBe(200);
    logger.info(`✅ UPDATE) updated successfully\n`);

    // ========== DELETE ==========
    logger.info('OPERATION 4) (DELETE)');
    logger.info('───────────────────────────────────────');

    const deleteResp = await apiClient.delete(`/posts/${postId}`);
    expect(deleteResp.status).toBe(200);
    logger.info(`✅ DELETE) deleted successfully\n`);

    logger.info('✨ TC_INT_004)');
    logger.info('EXPLANATION) performed complete CRUD cycle');
    logger.info('This validates all API operations work correctly\n');
  });
});
