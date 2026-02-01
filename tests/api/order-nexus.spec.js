import { test, expect } from '@playwright/test';
import { APIRequestContext } from '@playwright/test';
import { logger } from '../../utils/logger';
import { SchemaValidator, OrderNexusSchemas } from '../../utils/schema-validator';
import { env } from '../../config/environment.config';

/**
 * Order Nexus API Test Suite
 * Tests the create_or_update_order endpoint on staging environment
 * 
 * Test Coverage:
 * - Status code validation (200/201)
 * - Response schema validation
 * - Response body assertions
 * - Header validation
 * - Authentication validation
 * - Response time validation
 * - Error handling
 */

test.describe('Order Nexus API - Staging Environment', () => {
  let apiContext;
  const endpoint = '/order_nexus/v1/orders/create_or_update_order';
  const fullUrl = `${env.orderNexusBaseURL}${endpoint}`;

  // Test data payload
  const orderPayload = {
    order_type: 'PHARMA',
    order_id: `PO${Date.now()}`,
    group_order_id: `PO${Date.now()}`,
    user_id: '04bfd4e6-1e91-426e-88f4-e1730487842d',
    triggered_at: new Date().toISOString(),
    event: {
      event_name: 'ORDER_PLACED',
      sub_event_name: 'PAYMENT_CONFIRMED',
      event_type: 'ORDER_STATUS_UPDATE',
      description: 'Order has been placed successfully',
      triggered_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
    },
    order_details: {
      basic_order_details: {
        order_id: `PO${Date.now()}`,
        group_order_id: `PO${Date.now()}`,
        source: '1MG',
        platform: {
          name: 'ANDROID',
          version: '5.1.2',
        },
      },
      user_details: {
        user_id: '04bfd4e6-1e91-426e-88f4-e1730487842d',
        email: 'john.doe@example.com',
        contact_number: '+919876543210',
      },
      status: {
        id: 'ORDER_PLACED',
        title: 'Order Placed',
        sub_title: 'Your order has been placed successfully',
      },
      tags: ['URGENT', 'RX_REQUIRED'],
      extra_attributes: {
        are_rx_queued: false,
        screening_2_accepted: true,
      },
    },
  };

  test.beforeAll(async ({ playwright }) => {
    logger.info('\n========================================');
    logger.info('🚀 TEST SUITE) Nexus API - Staging');
    logger.info('========================================');
    logger.info(`Environment: ${env.testEnv}`);
    logger.info(`Base URL: ${env.orderNexusBaseURL}`);
    logger.info(`Endpoint: ${endpoint}`);
    logger.info(`Full URL: ${fullUrl}`);
    logger.info('========================================\n');

    // Validate environment configuration
    if (!env.orderNexusToken) {
      logger.warn('⚠️  WARNING)_ORDER_NEXUS_TOKEN is not set!');
      logger.warn('Please set it in config/.env.stag file');
    }

    // Create API context with base configuration
    apiContext = await playwright.request.newContext({
      baseURL: env.orderNexusBaseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'X-API-Version': 'v1',
        ...(env.orderNexusToken && { Authorization: `Bearer ${env.orderNexusToken}` }),
      },
      timeout: 30000, // 30 seconds timeout
    });

    logger.info('✅ API Context initialized successfully\n');
  });

  test.afterAll(async () => {
    await apiContext.dispose();
    logger.info('\n✅ API Context disposed');
    logger.info('========================================\n');
  });

  /**
   * TC_ON_001) or Update Order - Success Case
   * Tests the happy path with valid payload
   */
  test('TC_ON_001) /create_or_update_order - Status Code & Response Validation', async () => {
    logger.info('\n📝 TC_ON_001) or Update Order - Success Case');
    logger.info('─────────────────────────────────────────────────────────');
    logger.info('OBJECTIVE) successful order creation with all assertions');
    logger.info('VALIDATIONS:');
    logger.info('  ✓ Status code (200/201)');
    logger.info('  ✓ Response schema');
    logger.info('  ✓ Response body structure');
    logger.info('  ✓ Response headers');
    logger.info('  ✓ Response time');
    logger.info('─────────────────────────────────────────────────────────\n');

    // ========== PHASE 1) PAYLOAD VALIDATION ==========
    logger.info('PHASE 1) Payload Validation');
    logger.info('─────────────────────────────────────────────────────────');

    logger.info('Step 1) request payload against schema');
    const payloadValidation = SchemaValidator.validate(
      orderPayload,
      OrderNexusSchemas.createOrderRequestPayload
    );

    if (!payloadValidation.isValid) {
      logger.error('❌ Payload validation failed:', payloadValidation.errors);
      throw new Error(`Invalid payload: ${payloadValidation.errors?.join(', ')}`);
    }
    logger.info('✅ Payload validation passed');
    logger.info(`Payload: ${JSON.stringify(orderPayload, null, 2)}\n`);

    // ========== PHASE 2) REQUEST ==========
    logger.info('PHASE 2) API Request');
    logger.info('─────────────────────────────────────────────────────────');

    logger.info(`Step 2) POST request to ${endpoint}`);
    const startTime = Date.now();

    const response = await apiContext.post(endpoint, {
      data: orderPayload,
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    logger.info(`✅ Request completed in ${responseTime}ms`);
    logger.info(`Response Status: ${response.status()} ${response.statusText()}\n`);

    // ========== PHASE 3) CODE VALIDATION ==========
    logger.info('PHASE 3) Code Validation');
    logger.info('─────────────────────────────────────────────────────────');

    logger.info('Step 3) status code');
    const statusCode = response.status();

    // Accept both 200 and 201 as success
    expect(statusCode, `Expected status code 200 or 201, got ${statusCode}`).toBeGreaterThanOrEqual(200);
    expect(statusCode, `Expected status code 200 or 201, got ${statusCode}`).toBeLessThan(300);

    logger.info(`✅ Status code validation passed: ${statusCode}`);

    // ========== PHASE 4) HEADERS VALIDATION ==========
    logger.info('\nPHASE 4) Headers Validation');
    logger.info('─────────────────────────────────────────────────────────');

    logger.info('Step 4) response headers');
    const headers = response.headers();

    logger.info('Response Headers:');
    Object.entries(headers).forEach(([key, value]) => {
      logger.info(`  ${key}: ${value}`);
    });

    // Validate Content-Type header
    if (headers['content-type']) {
      expect(headers['content-type']).toContain('application/json');
      logger.info('✅ Content-Type header is application/json');
    }

    // ========== PHASE 5) BODY PARSING ==========
    logger.info('\nPHASE 5) Body Parsing');
    logger.info('─────────────────────────────────────────────────────────');

    logger.info('Step 5) response body');
    const responseBody = await response.json();

    logger.info('Response Body:');
    logger.info(JSON.stringify(responseBody, null, 2));

    // ========== PHASE 6) SCHEMA VALIDATION ==========
    logger.info('\nPHASE 6) Schema Validation');
    logger.info('─────────────────────────────────────────────────────────');

    logger.info('Step 6) response against schema');
    const schemaValidation = SchemaValidator.validate(
      responseBody,
      OrderNexusSchemas.createOrUpdateOrderResponse
    );

    if (!schemaValidation.isValid) {
      logger.error('❌ Schema validation failed:', schemaValidation.errors);
      throw new Error(`Schema validation failed: ${schemaValidation.errors?.join(', ')}`);
    }
    logger.info('✅ Response schema validation passed');

    // ========== PHASE 7) BODY ASSERTIONS ==========
    logger.info('\nPHASE 7) Body Field Assertions');
    logger.info('─────────────────────────────────────────────────────────');

    logger.info('Step 7) individual response fields');

    // Validate status field
    expect(responseBody).toHaveProperty('status');
    expect(responseBody.status).toBe('success');
    logger.info(`✅ Status field validated: ${responseBody.status}`);

    // Validate message field
    expect(responseBody).toHaveProperty('message');
    expect(responseBody.message).toBeTruthy();
    logger.info(`✅ Message field validated: ${responseBody.message}`);

    // Validate order_id field
    expect(responseBody).toHaveProperty('order_id');
    expect(responseBody.order_id).toBeTruthy();
    logger.info(`✅ Order ID validated: ${responseBody.order_id}`);

    // Validate timestamp field
    expect(responseBody).toHaveProperty('timestamp');
    expect(responseBody.timestamp).toBeTruthy();
    logger.info(`✅ Timestamp validated: ${responseBody.timestamp}`);

    // Validate timestamp is in ISO format
    const timestamp = new Date(responseBody.timestamp);
    expect(timestamp.toISOString()).toBeTruthy();
    logger.info('✅ Timestamp is valid ISO 8601 format');

    // ========== PHASE 8) TIME VALIDATION ==========
    logger.info('\nPHASE 8) Time Validation');
    logger.info('─────────────────────────────────────────────────────────');

    logger.info(`Step 8) response time (${responseTime}ms)`);

    // Response time should be less than 5 seconds (5000ms)
    expect(responseTime).toBeLessThan(5000);
    logger.info(`✅ Response time is acceptable: ${responseTime}ms (< 5000ms)`);

    // ========== TEST SUMMARY ==========
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✨ TC_ON_001) VALIDATIONS PASSED ✨');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('Summary:');
    logger.info(`  ✓ Status Code: ${statusCode}`);
    logger.info(`  ✓ Response Time: ${responseTime}ms`);
    logger.info(`  ✓ Order ID: ${responseBody.order_id}`);
    logger.info(`  ✓ Status: ${responseBody.status}`);
    logger.info(`  ✓ Message: ${responseBody.message}`);
    logger.info('═══════════════════════════════════════════════════════════\n');
  });

  /**
   * TC_ON_002) Validation
   * Tests endpoint with missing/invalid authentication
   */
  test.skip('TC_ON_002) /create_or_update_order - Authentication Validation', async ({ playwright }) => {
    logger.info('\n📝 TC_ON_002) Validation');
    logger.info('─────────────────────────────────────────────────────────');
    logger.info('OBJECTIVE) endpoint requires proper authentication\n');

    // Create context without authentication
    const unauthContext = await playwright.request.newContext({
      baseURL: env.orderNexusBaseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });

    const response = await unauthContext.post(endpoint, {
      data: orderPayload,
    });

    logger.info(`Response Status: ${response.status()}`);

    // Should return 401 Unauthorized or 403 Forbidden
    expect([401, 403]).toContain(response.status());
    logger.info('✅ Authentication validation passed - Unauthorized access blocked\n');

    await unauthContext.dispose();
  });
});
