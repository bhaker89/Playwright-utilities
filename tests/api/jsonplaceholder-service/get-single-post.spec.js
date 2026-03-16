const { test, expect } = require('../../../fixtures/base-test');
const { JsonplaceholderHelper } = require('../../../services/jsonplaceholder-service/jsonplaceholder-service-helper');

test.describe('Get Single Post API', () => {
  // Positive case: Get single post with valid post ID
  test('should return a successful response with a valid post ID', async ({ apiClient }) => {
    // Arrange
    const postId = 1;

    // Act
    const response = await JsonplaceholderHelper.getSinglePost(apiClient, postId);

    // Assert
    expect(response.status).toBe(200);
    expect(typeof response.body).toBe('string');
  });

  // Negative case: Get single post with invalid post ID
  test('should return a 400 response with an invalid post ID', async ({ apiClient }) => {
    // Arrange
    const postId = 'invalid';

    // Act
    const response = await JsonplaceholderHelper.getSinglePost(apiClient, postId);

    // Assert
    expect(response.status).toBe(400);
  });

  // Negative case: Get single post with missing post ID
  test('should return a 400 response with a missing post ID', async ({ apiClient }) => {
    // Arrange
    const postId = null;

    // Act
    const response = await JsonplaceholderHelper.getSinglePost(apiClient, postId);

    // Assert
    expect(response.status).toBe(400);
  });

  // Negative case: Get single post with unauthorized access
  test('should return a 401 response with unauthorized access', async ({ apiClient }) => {
    // Arrange
    const postId = 1;

    // Act
    const response = await JsonplaceholderHelper.getSinglePost(apiClient, postId, { auth: false });

    // Assert
    expect(response.status).toBe(401);
  });

  // Negative case: Get single post with internal server error
  test('should return a 500 response with internal server error', async ({ apiClient }) => {
    // Arrange
    const postId = 1;

    // Act
    const response = await JsonplaceholderHelper.getSinglePost(apiClient, postId, { error: true });

    // Assert
    expect(response.status).toBe(500);
  });
});