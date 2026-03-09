import { test, expect } from '../../../fixtures/base-test';
const { Inventory_vendor_managementHelper } = require('../../../services/inventory_vendor_management/inventory_vendor_management-helper');

test.describe('SKU Availability API', () => {
  test('should return a successful response with a valid request body', async ({ apiClient }) => {
    const payload = {
      cart_id: '3099555',
      cart_type: 'pharmacy',
      user_id: '535b4416-5bb7-4de3-89da-06273f9ddb4c',
      addresses: [
        {
          city: 'Gurgaon',
          pincode: '122001',
          state: 'Haryana',
          latitude: 28.474679,
          longitude: 77.1048978,
        },
      ],
      skus: [
        {
          sku_id: '174078',
          quantity: 3,
          sub_category: 'AYURVEDIC',
          is_dangerous_sku: false,
          is_banned: false,
        },
      ],
      is_loyal_user: false,
      pincodes: ['122001'],
      vendors_per_sku: 10,
    };

    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, payload);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('message');
    expect(typeof response.body.success).toBe('boolean');
    expect(typeof response.body.message).toBe('string');
  });

  test('should return a 400 response with a missing cart_id', async ({ apiClient }) => {
    const payload = {
      cart_type: 'pharmacy',
      user_id: '535b4416-5bb7-4de3-89da-06273f9ddb4c',
      addresses: [
        {
          city: 'Gurgaon',
          pincode: '122001',
          state: 'Haryana',
          latitude: 28.474679,
          longitude: 77.1048978,
        },
      ],
      skus: [
        {
          sku_id: '174078',
          quantity: 3,
          sub_category: 'AYURVEDIC',
          is_dangerous_sku: false,
          is_banned: false,
        },
      ],
      is_loyal_user: false,
      pincodes: ['122001'],
      vendors_per_sku: 10,
    };

    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, payload);
    expect(response.status).toBe(400);
  });

  test('should return a 400 response with an invalid cart_id', async ({ apiClient }) => {
    const payload = {
      cart_id: 'invalid',
      cart_type: 'pharmacy',
      user_id: '535b4416-5bb7-4de3-89da-06273f9ddb4c',
      addresses: [
        {
          city: 'Gurgaon',
          pincode: '122001',
          state: 'Haryana',
          latitude: 28.474679,
          longitude: 77.1048978,
        },
      ],
      skus: [
        {
          sku_id: '174078',
          quantity: 3,
          sub_category: 'AYURVEDIC',
          is_dangerous_sku: false,
          is_banned: false,
        },
      ],
      is_loyal_user: false,
      pincodes: ['122001'],
      vendors_per_sku: 10,
    };

    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, payload);
    expect(response.status).toBe(400);
  });

  test('should return a 400 response with a missing user_id', async ({ apiClient }) => {
    const payload = {
      cart_id: '3099555',
      cart_type: 'pharmacy',
      addresses: [
        {
          city: 'Gurgaon',
          pincode: '122001',
          state: 'Haryana',
          latitude: 28.474679,
          longitude: 77.1048978,
        },
      ],
      skus: [
        {
          sku_id: '174078',
          quantity: 3,
          sub_category: 'AYURVEDIC',
          is_dangerous_sku: false,
          is_banned: false,
        },
      ],
      is_loyal_user: false,
      pincodes: ['122001'],
      vendors_per_sku: 10,
    };

    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, payload);
    expect(response.status).toBe(400);
  });
});