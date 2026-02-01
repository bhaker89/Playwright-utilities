import { test, expect } from '../../fixtures/test-fixtures';
import { APIClient } from '../../utils/api-client';
import { LoginPage } from '../../pages/login.page';
import { generateRandomEmail, generateRandomString } from '../../utils/test-helpers';

/**
 * Integrated Test Suite) User Workflow (API + UI)
 */
test.describe('User Registration and Login Workflow', () => {
  let apiClient;
  let testUser;

  test.beforeAll(async () => {
    apiClient = new APIClient();
    await apiClient.init();
  });

  test.afterAll(async () => {
    // Cleanup) test user via API
    if (testUser?.id) {
      await apiClient.delete(`/users/${testUser.id}`);
    }
    await apiClient.dispose();
  });

  test('should complete full user workflow: register via API, login via UI, verify data', async ({ page }) => {
    // Step 1) user via API
    const userData = {
      name: `Test User ${generateRandomString(5)}`,
      email: generateRandomEmail(),
      password: 'TestPass123!',
    };

    const createResponse = await apiClient.post('/users', userData);
    expect(createResponse.status).toBe(201);
    testUser = createResponse.body;

    // Step 2) via UI
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(userData.email, userData.password);

    // Step 3) login successful
    await expect(page).toHaveURL(/.*dashboard/);

    // Step 4) user profile via UI
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="profile-link"]');

    const profileName = page.locator('[data-testid="profile-name"]');
    await expect(profileName).toHaveText(userData.name);

    const profileEmail = page.locator('[data-testid="profile-email"]');
    await expect(profileEmail).toHaveText(userData.email);

    // Step 5) user via UI
    await page.click('[data-testid="edit-profile"]');
    const newName = `Updated ${userData.name}`;
    await page.fill('[name="name"]', newName);
    await page.click('[data-testid="save-profile"]');

    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Step 6) update via API
    const getUserResponse = await apiClient.get(`/users/${testUser.id}`);
    expect(getUserResponse.status).toBe(200);
    expect(getUserResponse.body.name).toBe(newName);
  });

  test('should handle API data changes reflected in UI', async ({ page }) => {
    // Create user via API
    const userData = {
      name: 'API Test User',
      email: generateRandomEmail(),
      password: 'TestPass123!',
    };

    const createResponse = await apiClient.post('/users', userData);
    testUser = createResponse.body;

    // Update user via API
    await apiClient.put(`/users/${testUser.id}`, { name: 'Updated Name' });

    // Login and verify updated name appears in UI
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(userData.email, userData.password);

    await page.click('[data-testid="user-menu"]');
    const userName = page.locator('[data-testid="user-name"]');
    await expect(userName).toHaveText('Updated Name');
  });
});
