import { test, expect } from '../../fixtures/test-fixtures';
import { APIClient } from '../../utils/api-client';
import { LoginPage } from '../../pages/login.page';
import { generateRandomEmail, generateRandomString } from '../../utils/test-helpers';

test.describe('User Registration and Login Workflow', () => {
  let apiClient;
  let testUser;

  test.beforeAll(async () => {
    apiClient = new APIClient();
    await apiClient.init();
  });

  test.afterAll(async () => {
    if (testUser?.id) {
      await apiClient.delete(`/users/${testUser.id}`);
    }
    await apiClient.dispose();
  });

  test('complete user workflow: register via API, login via UI', async ({ page }) => {
    const userData = {
      name: `Test User ${generateRandomString(5)}`,
      email: generateRandomEmail(),
      password: 'TestPass123!',
    };

    const createResponse = await apiClient.post('/users', userData);
    expect(createResponse.status).toBe(201);
    testUser = createResponse.body;
    
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(userData.email, userData.password);
    await expect(page).toHaveURL(/.*dashboard/);
    
    const getUserResponse = await apiClient.get(`/users/${testUser.id}`);
    expect(getUserResponse.status).toBe(200);
    expect(getUserResponse.body.email).toBe(userData.email);
  });
});
