import { test, expect } from '../../../fixtures/base-test';
const { GrootHelper } = require('../../../services/groot/groot-helper');

test.describe('Get Task By Id API', () => {
  test('should return a successful response with a valid task id', async ({ apiClient }) => {
    const payload = {
      id: 4796,
    };
    const response = await GrootHelper.getTaskById(apiClient, payload);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('is_success');
    expect(response.body).toHaveProperty('status_code');
    expect(typeof response.body.is_success).toBe('boolean');
    expect(typeof response.body.status_code).toBe('number');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('external_order_id');
    expect(response.body.data).toHaveProperty('rider_id');
    expect(response.body.data).toHaveProperty('rider_identification');
    expect(response.body.data).toHaveProperty('rider_name');
    expect(response.body.data).toHaveProperty('rider_phone_number');
    expect(response.body.data).toHaveProperty('amount');
    expect(response.body.data).toHaveProperty('status');
    expect(response.body.data).toHaveProperty('type');
    expect(response.body.data).toHaveProperty('delivery_checklist');
    expect(response.body.data).toHaveProperty('metadata');
    expect(response.body.data).toHaveProperty('pickup_address');
    expect(response.body.data).toHaveProperty('drop_address');
    expect(response.body.data).toHaveProperty('tags');
    expect(response.body.data).toHaveProperty('customer_details');
    expect(response.body.data).toHaveProperty('expected_eta');
    expect(response.body.data).toHaveProperty('actual_eta');
    expect(response.body.data).toHaveProperty('current_eta');
    expect(response.body.data).toHaveProperty('created_at');
    expect(response.body.data).toHaveProperty('updated_at');
    expect(response.body.data).toHaveProperty('notes');
    expect(response.body.data).toHaveProperty('latest');
    expect(response.body.data).toHaveProperty('fulfilled_by');
    expect(response.body.data).toHaveProperty('sla_status');
    expect(response.body.data).toHaveProperty('distance');
    expect(response.body.data).toHaveProperty('batch_id');
    expect(response.body.data).toHaveProperty('order_id');
    expect(response.body.data).toHaveProperty('order');
    expect(response.body.data).toHaveProperty('rider_info');
  });

  test('should return a 400 response with a missing id', async ({ apiClient }) => {
    const payload = {};
    const response = await GrootHelper.getTaskById(apiClient, payload);
    expect(response.status).toBe(400);
  });

  test('should return a 401 response with an invalid id', async ({ apiClient }) => {
    const payload = {
      id: 'invalid',
    };
    const response = await GrootHelper.getTaskById(apiClient, payload);
    expect(response.status).toBe(401);
  });
});