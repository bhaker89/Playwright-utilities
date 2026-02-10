const { test: base, expect } = require('@playwright/test');
const { OrderNexusHelper } = require('../../services/order-nexus/nexus-helper');

/**
 * Custom Playwright fixtures for the Enterprise QA Platform
 * Automatically injects service helpers and manages context
 */
const test = base.extend({
    // Nexus Service Fixture
    nexus: async ({ playwright }, use) => {
        const { env } = require('../../config/environment.config');

        // Initialize context
        const apiContext = await OrderNexusHelper.createApiContext(
            playwright,
            env.internalApiBaseURL || env.orderNexusBaseURL,
            env.orderNexusToken
        );

        // Provide the helper instance with context
        const helper = {
            context: apiContext,
            validatePayload: (p) => OrderNexusHelper.validatePayload(p),
            validateResponse: (r) => OrderNexusHelper.validateResponse(r),
            createOrder: (payload) => OrderNexusHelper.makePostRequest(
                apiContext,
                '/order_nexus/v1/orders/create_or_update_order',
                payload
            )
        };
        await use(helper);

        // Automatic cleanup
        await apiContext.dispose();
    },

    // UI Engine Fixture (with Self-Healing)
    ui: async ({ page }, use) => {
        const { UIEngine } = require('../engines/ui-engine');
        const uiEngine = new UIEngine(page);
        await use(uiEngine);
    },

    // User Service Fixture
    userService: async ({ playwright }, use) => {
        const { env } = require('../../config/environment.config');
        // For now, mapping to BASE_URL or user service specific
        const apiContext = await playwright.request.newContext({
            baseURL: env.userServiceBaseURL || env.baseURL,
            extraHTTPHeaders: { 'Authorization': `Bearer ${env.userServiceToken}` }
        });

        const helper = {
            context: apiContext,
            getUsers: () => apiContext.get('/users'),
            getUser: (id) => apiContext.get(`/users/${id}`),
            createUser: (data) => apiContext.post('/users', { data }),
            updateUser: (id, data) => apiContext.put(`/users/${id}`, { data }),
            healthCheck: () => apiContext.get('/health'),
        };
        await use(helper);
        await apiContext.dispose();
    },
});

module.exports = { test, expect };
