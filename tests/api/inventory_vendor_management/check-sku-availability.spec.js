const { test, expect } = require('../../../fixtures/base-test');
const { Inventory_vendor_managementHelper } = require('../../../services/inventory_vendor_management/inventory_vendor_management-helper');

/**
 * Test suite for the SKU Availability API.
 */
test.describe('SKU Availability API', () => {
  // Positive case: should successfully check SKU availability
  /**
   * Tests that the API returns a successful response with a valid request body.
   */
  test('should return a successful response with a valid request body', async ({ apiClient }) => {
    // Arrange
    const requestBody = {
      cart_id: "3099555",
      cart_type: "pharmacy",
      user_id: "535b4416-5bb7-4de3-89da-06273f9ddb4c",
      addresses: [
        {
          city: "Gurgaon",
          pincode: "122001",
          state: "Haryana",
          latitude: 28.474679,
          longitude: 77.1048978
        }
      ],
      skus: [
        {
          sku_id: "174078",
          quantity: 3,
          sub_category: "AYURVEDIC",
          storage_temperature: null,
          is_dangerous_sku: false,
          is_banned: false
        }
      ],
      is_loyal_user: false,
      pincodes: ["122001"],
      vendors_per_sku: 10
    };

    // Act
    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, requestBody);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body.status).toBe('success');
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('skus');
    expect(response.body.data.skus).toBeInstanceOf(Array);
    expect(response.body.data.skus[0]).toHaveProperty('sku_id');
    expect(response.body.data.skus[0]).toHaveProperty('is_available');
    expect(response.body.data.skus[0]).toHaveProperty('vendors');
    expect(response.body.data.skus[0].vendors).toBeInstanceOf(Array);
    expect(response.body.data.skus[0].vendors[0]).toHaveProperty('vendor_id');
    expect(response.body.data.skus[0].vendors[0]).toHaveProperty('name');
    expect(response.body.data.skus[0].vendors[0]).toHaveProperty('available_quantity');
    expect(response.body.data.skus[0].vendors[0]).toHaveProperty('pincode');
    expect(response.body.data.skus[0].vendors[0]).toHaveProperty('is_serviceable');
    expect(response.body.data.skus[0].vendors[0]).toHaveProperty('mrp');
    expect(response.body.data.skus[0].vendors[0]).toHaveProperty('selling_price');
  });

  // Negative case: should handle missing cart_id
  /**
   * Tests that the API returns a 400 response with a missing cart_id.
   */
  test('should return a 400 response with a missing cart_id', async ({ apiClient }) => {
    // Arrange
    const requestBody = {
      cart_type: "pharmacy",
      user_id: "535b4416-5bb7-4de3-89da-06273f9ddb4c",
      addresses: [
        {
          city: "Gurgaon",
          pincode: "122001",
          state: "Haryana",
          latitude: 28.474679,
          longitude: 77.1048978
        }
      ],
      skus: [
        {
          sku_id: "174078",
          quantity: 3,
          sub_category: "AYURVEDIC",
          storage_temperature: null,
          is_dangerous_sku: false,
          is_banned: false
        }
      ],
      is_loyal_user: false,
      pincodes: ["122001"],
      vendors_per_sku: 10
    };

    // Act
    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, requestBody);

    // Assert
    expect(response.status).toBe(400);
  });

  // Negative case: should handle invalid cart_id
  /**
   * Tests that the API returns a 400 response with an invalid cart_id.
   */
  test('should return a 400 response with an invalid cart_id', async ({ apiClient }) => {
    // Arrange
    const requestBody = {
      cart_id: "invalid",
      cart_type: "pharmacy",
      user_id: "535b4416-5bb7-4de3-89da-06273f9ddb4c",
      addresses: [
        {
          city: "Gurgaon",
          pincode: "122001",
          state: "Haryana",
          latitude: 28.474679,
          longitude: 77.1048978
        }
      ],
      skus: [
        {
          sku_id: "174078",
          quantity: 3,
          sub_category: "AYURVEDIC",
          storage_temperature: null,
          is_dangerous_sku: false,
          is_banned: false
        }
      ],
      is_loyal_user: false,
      pincodes: ["122001"],
      vendors_per_sku: 10
    };

    // Act
    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, requestBody);

    // Assert
    expect(response.status).toBe(400);
  });

  // Negative case: should handle missing user_id
  /**
   * Tests that the API returns a 400 response with a missing user_id.
   */
  test('should return a 400 response with a missing user_id', async ({ apiClient }) => {
    // Arrange
    const requestBody = {
      cart_id: "3099555",
      cart_type: "pharmacy",
      addresses: [
        {
          city: "Gurgaon",
          pincode: "122001",
          state: "Haryana",
          latitude: 28.474679,
          longitude: 77.1048978
        }
      ],
      skus: [
        {
          sku_id: "174078",
          quantity: 3,
          sub_category: "AYURVEDIC",
          storage_temperature: null,
          is_dangerous_sku: false,
          is_banned: false
        }
      ],
      is_loyal_user: false,
      pincodes: ["122001"],
      vendors_per_sku: 10
    };

    // Act
    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, requestBody);

    // Assert
    expect(response.status).toBe(400);
  });

  // Negative case: should handle invalid user_id
  /**
   * Tests that the API returns a 400 response with an invalid user_id.
   */
  test('should return a 400 response with an invalid user_id', async ({ apiClient }) => {
    // Arrange
    const requestBody = {
      cart_id: "3099555",
      cart_type: "pharmacy",
      user_id: "invalid",
      addresses: [
        {
          city: "Gurgaon",
          pincode: "122001",
          state: "Haryana",
          latitude: 28.474679,
          longitude: 77.1048978
        }
      ],
      skus: [
        {
          sku_id: "174078",
          quantity: 3,
          sub_category: "AYURVEDIC",
          storage_temperature: null,
          is_dangerous_sku: false,
          is_banned: false
        }
      ],
      is_loyal_user: false,
      pincodes: ["122001"],
      vendors_per_sku: 10
    };

    // Act
    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, requestBody);

    // Assert
    expect(response.status).toBe(400);
  });

  // Negative case: should handle missing addresses
  /**
   * Tests that the API returns a 400 response with missing addresses.
   */
  test('should return a 400 response with missing addresses', async ({ apiClient }) => {
    // Arrange
    const requestBody = {
      cart_id: "3099555",
      cart_type: "pharmacy",
      user_id: "535b4416-5bb7-4de3-89da-06273f9ddb4c",
      skus: [
        {
          sku_id: "174078",
          quantity: 3,
          sub_category: "AYURVEDIC",
          storage_temperature: null,
          is_dangerous_sku: false,
          is_banned: false
        }
      ],
      is_loyal_user: false,
      pincodes: ["122001"],
      vendors_per_sku: 10
    };

    // Act
    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, requestBody);

    // Assert
    expect(response.status).toBe(400);
  });

  // Negative case: should handle invalid addresses
  /**
   * Tests that the API returns a 400 response with invalid addresses.
   */
  test('should return a 400 response with invalid addresses', async ({ apiClient }) => {
    // Arrange
    const requestBody = {
      cart_id: "3099555",
      cart_type: "pharmacy",
      user_id: "535b4416-5bb7-4de3-89da-06273f9ddb4c",
      addresses: [
        {
          city: "Gurgaon",
          pincode: "invalid",
          state: "Haryana",
          latitude: 28.474679,
          longitude: 77.1048978
        }
      ],
      skus: [
        {
          sku_id: "174078",
          quantity: 3,
          sub_category: "AYURVEDIC",
          storage_temperature: null,
          is_dangerous_sku: false,
          is_banned: false
        }
      ],
      is_loyal_user: false,
      pincodes: ["122001"],
      vendors_per_sku: 10
    };

    // Act
    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, requestBody);

    // Assert
    expect(response.status).toBe(400);
  });

  // Negative case: should handle missing skus
  /**
   * Tests that the API returns a 400 response with missing skus.
   */
  test('should return a 400 response with missing skus', async ({ apiClient }) => {
    // Arrange
    const requestBody = {
      cart_id: "3099555",
      cart_type: "pharmacy",
      user_id: "535b4416-5bb7-4de3-89da-06273f9ddb4c",
      addresses: [
        {
          city: "Gurgaon",
          pincode: "122001",
          state: "Haryana",
          latitude: 28.474679,
          longitude: 77.1048978
        }
      ],
      is_loyal_user: false,
      pincodes: ["122001"],
      vendors_per_sku: 10
    };

    // Act
    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, requestBody);

    // Assert
    expect(response.status).toBe(400);
  });

  // Negative case: should handle invalid skus
  /**
   * Tests that the API returns a 400 response with invalid skus.
   */
  test('should return a 400 response with invalid skus', async ({ apiClient }) => {
    // Arrange
    const requestBody = {
      cart_id: "3099555",
      cart_type: "pharmacy",
      user_id: "535b4416-5bb7-4de3-89da-06273f9ddb4c",
      addresses: [
        {
          city: "Gurgaon",
          pincode: "122001",
          state: "Haryana",
          latitude: 28.474679,
          longitude: 77.1048978
        }
      ],
      skus: [
        {
          sku_id: "invalid",
          quantity: 3,
          sub_category: "AYURVEDIC",
          storage_temperature: null,
          is_dangerous_sku: false,
          is_banned: false
        }
      ],
      is_loyal_user: false,
      pincodes: ["122001"],
      vendors_per_sku: 10
    };

    // Act
    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, requestBody);

    // Assert
    expect(response.status).toBe(400);
  });

  // Negative case: should handle missing pincodes
  /**
   * Tests that the API returns a 400 response with missing pincodes.
   */
  test('should return a 400 response with missing pincodes', async ({ apiClient }) => {
    // Arrange
    const requestBody = {
      cart_id: "3099555",
      cart_type: "pharmacy",
      user_id: "535b4416-5bb7-4de3-89da-06273f9ddb4c",
      addresses: [
        {
          city: "Gurgaon",
          pincode: "122001",
          state: "Haryana",
          latitude: 28.474679,
          longitude: 77.1048978
        }
      ],
      skus: [
        {
          sku_id: "174078",
          quantity: 3,
          sub_category: "AYURVEDIC",
          storage_temperature: null,
          is_dangerous_sku: false,
          is_banned: false
        }
      ],
      is_loyal_user: false,
      vendors_per_sku: 10
    };

    // Act
    const response = await Inventory_vendor_managementHelper.checkSkuAvailability(apiClient, requestBody);

    // Assert
    expect(response.status).toBe(400);
  });

  // Negative case: should handle invalid pincodes
  /**
   * Tests that the API returns a 400 response with invalid pincodes.
   */
  test('should return a 400 response with invalid pincodes', async ({ apiClient