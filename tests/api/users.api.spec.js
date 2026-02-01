const { test, expect } = require('../../fixtures/test-fixtures');
const { APIClient } = require('../../utils/api-client');
const Joi = require('joi');
const { SchemaValidator } = require('../../utils/schema-validator');

/**
 * API Test Suite: User Management
 */
test.describe('User API Tests', () => {
  /** @type {APIClient} */
  let apiClient;

  test.beforeAll(async () => {
    apiClient = new APIClient();
    await apiClient.init();
  });

  test.afterAll(async () => {
    await apiClient.dispose();
  });

  test('GET /users - should return list of users', async () => {
    const response = await apiClient.get('/users');

    // Assertions
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.responseTime).toBeLessThan(3000);
  });

  test('GET /users/:id - should return user details', async () => {
    const userId = 1;
    const response = await apiClient.get(`/users/${userId}`);

    // Define schema
    const userSchema = Joi.object({
      id: Joi.number().required(),
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      createdAt: Joi.string().required(),
    });

    // Validate response
    expect(response.status).toBe(200);
    expect(() => SchemaValidator.validate(response.body, userSchema)).not.toThrow();
    expect(response.body.id).toBe(userId);
  });

  test('POST /users - should create new user', async () => {
    const newUser = {
      name: 'John Doe',
      email: `john.doe.${Date.now()}@example.com`,
      password: 'SecurePass123!',
    };

    const response = await apiClient.post('/users', newUser);

    // Assertions
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe(newUser.email);
    expect(response.body).not.toHaveProperty('password'); // Password should not be returned
  });

  test('PUT /users/:id - should update user', async () => {
    const userId = 1;
    const updateData = {
      name: 'John Updated',
    };

    const response = await apiClient.put(`/users/${userId}`, updateData);

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.name).toBe(updateData.name);
  });

  test('DELETE /users/:id - should delete user', async () => {
    const userId = 999; // Use test user ID
    const response = await apiClient.delete(`/users/${userId}`);

    // Assertions
    expect(response.status).toBe(204);
  });

  test('GET /users with pagination', async () => {
    const response = await apiClient.get('/users', {
      params: { page: 1, limit: 10 },
    });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.pagination).toBeDefined();
    expect(response.body.data.length).toBeLessThanOrEqual(10);
  });

  test('GET /users/:id with invalid ID - should return 404', async () => {
    const response = await apiClient.get('/users/999999');

    // Assertions
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  test('API performance - response time should be under 2 seconds', async () => {
    const response = await apiClient.get('/users');

    expect(response.responseTime).toBeLessThan(2000);
  });
});