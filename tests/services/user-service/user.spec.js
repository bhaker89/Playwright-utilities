import { test, expect } from '../../../fixtures/test-fixtures';
import { APIClientFactory } from '../../../utils/multi-service-api-client';
import { UserDataFactory } from '../../../utils/data-factory';
import { SchemaValidator, CommonSchemas } from '../../../utils/schema-validator';
import { logger } from '../../../utils/logger';

/**
 * User Service Tests
 * Organized by microservice for scalability
 */
test.describe('User Service - API Tests', () => {
  let userClient)<ReturnType<typeof APIClientFactory.getClient>>;

  test.beforeAll(async () => {
    userClient = await APIClientFactory.getClient('user-service');
    logger.info('User Service client initialized');
  });

  test.afterAll(async () => {
    await APIClientFactory.disposeAll();
  });

  test('should create a new user', async () => {
    const userData = UserDataFactory.generateUser();
    const response = await userClient.post('/users', userData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');

    // Validate response schema
    SchemaValidator.assertValid(response.body, CommonSchemas.user);
  });

  test('should get user by ID', async () => {
    const response = await userClient.get('/users/1');

    expect(response.status).toBe(200);
    SchemaValidator.assertValid(response.body, CommonSchemas.user);
  });

  test('should update user', async () => {
    const updateData = { firstName: 'Updated' };
    const response = await userClient.put('/users/1', updateData);

    expect(response.status).toBe(200);
    expect(response.body.firstName).toBe('Updated');
  });

  test('should handle service errors gracefully', async () => {
    const response = await userClient.get('/users/999999');

    expect(response.status).toBe(404);
    // Validate error response schema
    SchemaValidator.assertValid(response.body, CommonSchemas.errorResponse);
  });

  test('should verify service health', async () => {
    const isHealthy = await userClient.healthCheck();
    expect(isHealthy).toBeTruthy();
  });

  test('should handle pagination', async () => {
    const response = await userClient.get('/users', {
      params: { page: 1, pageSize: 10 },
    });

    expect(response.status).toBe(200);
    const paginatedSchema = CommonSchemas.paginatedResponse(CommonSchemas.user);
    SchemaValidator.assertValid(response.body, paginatedSchema);
  });
});
