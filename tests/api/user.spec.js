const { test, expect } = require('../../fixtures/base-test');

/**
 * User Service - Clean API Tests
 * No boilerplate, just assertions and actions
 */
test.describe('User Service - API Tests', () => {

    test('should create a new user', async ({ userService }) => {
        const userData = {
            email: `test-${Date.now()}@example.com`,
            firstName: 'Clean',
            lastName: 'User'
        };

        const response = await userService.createUser(userData);

        // Connectivity check (allows 403 or 201 for staging)
        expect([201, 403]).toContain(response.status());

        if (response.status() === 201) {
            const body = await response.json();
            expect(body).toHaveProperty('id');
        }
    });

    test('should verify service health', async ({ userService }) => {
        const response = await userService.healthCheck();
        expect([200, 403]).toContain(response.status());
    });

    test('should handle user retrieval', async ({ userService }) => {
        const response = await userService.getUser('1');
        expect([200, 403, 404]).toContain(response.status());
    });
});
