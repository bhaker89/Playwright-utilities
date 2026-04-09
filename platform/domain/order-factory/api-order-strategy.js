/**
 * API Order Strategy
 * 
 * Creates orders using backend REST APIs
 * - Fastest execution
 * - No browser required
 * - Direct database state
 */

const { logOrderCreation } = require('./telemetry');

/**
 * Create order via API
 * 
 * @param {Object} orderBlueprint - Order configuration
 * @param {Object} context - Execution context
 * @param {Object} context.environment - Environment config
 * @param {Object} context.auth - Authentication tokens
 * @param {Object} context.apiClient - HTTP client
 * @returns {Promise<Object>} Result { success, orderId, orderPayload, duration }
 */
async function createOrderViaAPI(orderBlueprint, context = {}) {
  const startTime = Date.now();
  const { environment, auth, apiClient } = context;

  console.log('[API_ORDER_STRATEGY] Creating order via API...');
  console.log('[API_ORDER_STRATEGY] Blueprint:', JSON.stringify(orderBlueprint, null, 2));

  try {
    // Build API payload from blueprint
    const apiPayload = buildAPIPayload(orderBlueprint, context);
    
    console.log('[API_ORDER_STRATEGY] API Payload:', JSON.stringify(apiPayload, null, 2));

    // Make API request
    const response = await executeAPIRequest(apiPayload, context);

    const duration = Date.now() - startTime;

    if (response.success) {
      const orderId = response.orderId || response.order_id || response.id;
      
      console.log(`[API_ORDER_STRATEGY] ✓ Order created successfully orderId=${orderId}`);

      // Log telemetry
      logOrderCreation({
        type: orderBlueprint.type,
        strategy: 'api',
        duration,
        success: true,
        orderId,
        environment: environment?.name,
        blueprint: orderBlueprint
      });

      return {
        success: true,
        orderId,
        orderPayload: apiPayload,
        responseData: response,
        duration,
        strategy: 'api'
      };
    } else {
      throw new Error(response.error || 'API request failed');
    }

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('[API_ORDER_STRATEGY] ✗ Order creation failed:', error.message);

    // Log failure telemetry
    logOrderCreation({
      type: orderBlueprint.type,
      strategy: 'api',
      duration,
      success: false,
      environment: environment?.name,
      blueprint: orderBlueprint,
      error
    });

    return {
      success: false,
      error: error.message,
      duration,
      strategy: 'api'
    };
  }
}

/**
 * Build API payload from order blueprint
 * @param {Object} blueprint - Order blueprint
 * @param {Object} context - Execution context
 * @returns {Object} API request payload
 */
function buildAPIPayload(blueprint, context) {
  const {
    type,
    prescription = true,
    split = false,
    discount = null,
    source = 'web',
    items = [],
    address = null,
    payment = 'cod',
    attributes = {}
  } = blueprint;

  // Base payload
  const payload = {
    orderType: type,
    source,
    payment,
    requiresPrescription: prescription,
    splitOrder: split,
    ...attributes
  };

  // Add items
  if (items.length > 0) {
    payload.items = items;
  } else {
    // Default items based on type
    payload.items = getDefaultItemsForType(type);
  }

  // Add discount
  if (discount) {
    payload.discount = {
      type: discount,
      code: attributes.discountCode || 'AUTO'
    };
  }

  // Add address
  if (address) {
    payload.address = address;
  } else {
    payload.address = context.defaultAddress || getDefaultAddress();
  }

  // Add user context
  if (context.userId) {
    payload.userId = context.userId;
  }

  // Add timestamp
  payload.createdAt = new Date().toISOString();

  return payload;
}

/**
 * Execute API request to create order
 * @param {Object} payload - API payload
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} API response
 */
async function executeAPIRequest(payload, context) {
  const { apiClient, environment } = context;

  // If no API client, simulate success for testing
  if (!apiClient) {
    console.log('[API_ORDER_STRATEGY] No API client provided, simulating order creation...');
    return {
      success: true,
      orderId: `ORDER_${Date.now()}`,
      order_id: `ORDER_${Date.now()}`,
      message: 'Order created (simulated)'
    };
  }

  // Get API endpoint
  const endpoint = environment?.apiEndpoints?.createOrder || '/api/v1/orders';
  const baseURL = environment?.baseURL || 'https://api.example.com';

  // Make request
  try {
    const response = await apiClient.post(`${baseURL}${endpoint}`, payload);
    
    return {
      success: response.status === 200 || response.status === 201,
      orderId: response.data?.orderId || response.data?.order_id || response.data?.id,
      ...response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get default items for order type
 * @param {string} type - Order type
 * @returns {Array} Default items
 */
function getDefaultItemsForType(type) {
  const defaults = {
    rx: [
      { sku: 'MED_RX_001', name: 'Prescription Medicine', quantity: 1, price: 250 }
    ],
    otc: [
      { sku: 'MED_OTC_001', name: 'OTC Medicine', quantity: 2, price: 100 }
    ],
    mixed: [
      { sku: 'MED_RX_001', name: 'Prescription Medicine', quantity: 1, price: 250 },
      { sku: 'MED_OTC_001', name: 'OTC Medicine', quantity: 1, price: 100 }
    ],
    b2b: [
      { sku: 'B2B_BULK_001', name: 'Bulk Order Item', quantity: 100, price: 5000 }
    ],
    corporate: [
      { sku: 'CORP_001', name: 'Corporate Package', quantity: 1, price: 1000 }
    ]
  };

  return defaults[type] || defaults.otc;
}

/**
 * Get default address
 * @returns {Object} Default address
 */
function getDefaultAddress() {
  return {
    name: 'Test User',
    phone: '9999999999',
    addressLine1: 'Test Address',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India'
  };
}

module.exports = {
  createOrderViaAPI,
  buildAPIPayload
};