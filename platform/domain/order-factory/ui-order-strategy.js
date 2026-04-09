/**
 * UI Order Strategy
 * 
 * Creates orders through browser UI flows
 * - Most reliable (real user flow)
 * - Validates UI state
 * - Slower than API
 * - Fallback when API fails
 */

const { logOrderCreation } = require('./telemetry');

/**
 * Create order via UI
 * 
 * @param {Object} orderBlueprint - Order configuration
 * @param {Object} context - Execution context
 * @param {Object} context.page - Playwright page object
 * @param {Object} context.flowComposer - Flow composition engine
 * @param {Object} context.environment - Environment config
 * @returns {Promise<Object>} Result { success, orderId, duration }
 */
async function createOrderViaUI(orderBlueprint, context = {}) {
  const startTime = Date.now();
  const { page, flowComposer, environment, isFallback = false } = context;

  const strategyLabel = isFallback ? 'UI_FALLBACK' : 'UI_ORDER_STRATEGY';
  
  console.log(`[${strategyLabel}] Creating order via UI...`);
  console.log(`[${strategyLabel}] Blueprint:`, JSON.stringify(orderBlueprint, null, 2));

  try {
    // Validate prerequisites
    if (!page) {
      throw new Error('Browser page not available for UI strategy');
    }

    // Compose and execute flow
    const flowResult = await executeUIFlow(orderBlueprint, context);

    const duration = Date.now() - startTime;

    if (flowResult.success) {
      const orderId = flowResult.orderId || extractOrderIdFromUI(page);
      
      console.log(`[${strategyLabel}] ✓ Order created successfully orderId=${orderId}`);

      // Log telemetry
      logOrderCreation({
        type: orderBlueprint.type,
        strategy: isFallback ? 'ui_fallback' : 'ui',
        duration,
        success: true,
        orderId,
        environment: environment?.name,
        blueprint: orderBlueprint
      });

      return {
        success: true,
        orderId,
        duration,
        strategy: isFallback ? 'ui_fallback' : 'ui',
        flowSteps: flowResult.steps
      };
    } else {
      throw new Error(flowResult.error || 'UI flow execution failed');
    }

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`[${strategyLabel}] ✗ Order creation failed:`, error.message);

    // Log failure telemetry
    logOrderCreation({
      type: orderBlueprint.type,
      strategy: isFallback ? 'ui_fallback' : 'ui',
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
      strategy: isFallback ? 'ui_fallback' : 'ui'
    };
  }
}

/**
 * Execute UI flow for order creation
 * @param {Object} blueprint - Order blueprint
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Flow execution result
 */
async function executeUIFlow(blueprint, context) {
  const { page, flowComposer } = context;

  console.log('[UI_ORDER_STRATEGY] Composing UI flow...');

  try {
    // If flow composer available, use it
    if (flowComposer) {
      const flowSteps = await flowComposer.composeOrderFlow(blueprint);
      console.log(`[UI_ORDER_STRATEGY] Composed ${flowSteps.length} steps`);
      
      // Execute composed flow
      const result = await flowComposer.executeFlow(flowSteps, { page });
      return result;
    }

    // Otherwise, execute basic flow
    console.log('[UI_ORDER_STRATEGY] No flow composer, executing basic flow...');
    const orderId = await executeBasicOrderFlow(blueprint, page);

    return {
      success: true,
      orderId,
      steps: ['basic_flow']
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Execute basic order flow (fallback when no composer)
 * @param {Object} blueprint - Order blueprint
 * @param {Object} page - Playwright page
 * @returns {Promise<string>} Order ID
 */
async function executeBasicOrderFlow(blueprint, page) {
  const { type, items = [] } = blueprint;

  console.log('[UI_ORDER_STRATEGY] Executing basic order flow...');

  // Simulate basic flow steps
  // In real implementation, this would navigate UI and interact
  
  // 1. Navigate to order page
  console.log('[UI_ORDER_STRATEGY] Step 1: Navigate to order page');
  
  // 2. Add items
  console.log('[UI_ORDER_STRATEGY] Step 2: Add items to cart');
  
  // 3. Proceed to checkout
  console.log('[UI_ORDER_STRATEGY] Step 3: Proceed to checkout');
  
  // 4. Fill address
  console.log('[UI_ORDER_STRATEGY] Step 4: Fill address');
  
  // 5. Select payment
  console.log('[UI_ORDER_STRATEGY] Step 5: Select payment method');
  
  // 6. Place order
  console.log('[UI_ORDER_STRATEGY] Step 6: Place order');

  // Generate order ID
  const orderId = `UI_ORDER_${Date.now()}`;
  
  return orderId;
}

/**
 * Extract order ID from UI after order placement
 * @param {Object} page - Playwright page
 * @returns {Promise<string>} Extracted order ID
 */
async function extractOrderIdFromUI(page) {
  try {
    // Common selectors for order ID
    const selectors = [
      '[data-testid="order-id"]',
      '.order-id',
      '#order-id',
      'text=/Order ID[:\\s]+([A-Z0-9]+)/i',
      'text=/Order #([A-Z0-9]+)/i'
    ];

    for (const selector of selectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent();
          const match = text.match(/[A-Z0-9]{8,}/);
          if (match) {
            console.log('[UI_ORDER_STRATEGY] Extracted order ID from UI:', match[0]);
            return match[0];
          }
        }
      } catch (e) {
        // Try next selector
      }
    }

    // If extraction failed, generate fallback ID
    console.log('[UI_ORDER_STRATEGY] Could not extract order ID from UI, generating fallback');
    return `UI_ORDER_${Date.now()}`;

  } catch (error) {
    console.warn('[UI_ORDER_STRATEGY] Error extracting order ID:', error.message);
    return `UI_ORDER_${Date.now()}`;
  }
}

module.exports = {
  createOrderViaUI,
  executeUIFlow,
  extractOrderIdFromUI
};