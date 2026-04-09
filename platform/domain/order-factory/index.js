/**
 * Order Factory
 * 
 * Main entry point for order creation
 * 
 * Responsibilities:
 * - Accept order blueprints
 * - Resolve execution strategy (API/UI/hybrid)
 * - Orchestrate order creation
 * - Return order ID and metadata
 * - Handle failures gracefully
 * 
 * Usage:
 *   const { createOrder } = require('./platform/domain/order-factory');
 *   
 *   const result = await createOrder({
 *     type: 'rx',
 *     prescription: false,
 *     split: true,
 *     source: 'paytm'
 *   }, context);
 *   
 *   console.log(result.orderId); // ORDER_123456
 */

const { resolveStrategy, validateStrategy } = require('./strategy-resolver');
const { createOrderViaAPI } = require('./api-order-strategy');
const { createOrderViaUI } = require('./ui-order-strategy');
const { logOrderCreation } = require('./telemetry');

/**
 * Create order using optimal strategy
 * 
 * @param {Object} orderBlueprint - Order configuration
 * @param {string} orderBlueprint.type - Order type (rx, otc, mixed, b2b, corporate)
 * @param {boolean} orderBlueprint.prescription - Whether prescription required
 * @param {boolean} orderBlueprint.split - Whether to split order
 * @param {string} orderBlueprint.source - Order source (web, app, paytm, etc.)
 * @param {string} orderBlueprint.discount - Discount type (coupon, loyalty, etc.)
 * @param {Array} orderBlueprint.items - Order items
 * @param {Object} orderBlueprint.attributes - Additional attributes
 * 
 * @param {Object} context - Execution context
 * @param {Object} context.page - Playwright page (for UI strategy)
 * @param {Object} context.apiClient - HTTP client (for API strategy)
 * @param {Object} context.environment - Environment config
 * @param {Object} context.flowComposer - Flow composition engine
 * @param {Object} context.options - Strategy options
 * 
 * @returns {Promise<Object>} Result
 *   {
 *     success: boolean,
 *     orderId: string,
 *     strategy: string,
 *     duration: number,
 *     error?: string
 *   }
 */
async function createOrder(orderBlueprint, context = {}) {
  console.log('\n' + '='.repeat(60));
  console.log('[ORDER_FACTORY] Creating order...');
  console.log('[ORDER_FACTORY] Blueprint:', JSON.stringify(orderBlueprint, null, 2));
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    // Validate blueprint
    validateBlueprint(orderBlueprint);

    // Resolve strategy
    const strategy = resolveStrategy(orderBlueprint, context.options || {});
    console.log(`[ORDER_FACTORY] Resolved strategy: ${strategy}`);

    // Validate strategy can be executed
    const validation = validateStrategy(strategy, {
      apiAvailable: !!context.apiClient,
      browserAvailable: !!context.page
    });

    if (!validation.valid) {
      throw new Error(`Strategy validation failed: ${validation.reason}`);
    }

    // Execute strategy
    let result;
    
    switch (strategy) {
      case 'api':
        result = await executeAPIStrategy(orderBlueprint, context);
        break;
        
      case 'ui':
        result = await executeUIStrategy(orderBlueprint, context);
        break;
        
      case 'hybrid':
        result = await executeHybridStrategy(orderBlueprint, context);
        break;
        
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }

    const totalDuration = Date.now() - startTime;

    // Persist order blueprint in execution context
    // This enables downstream assertion inference and validation reuse
    if (context) {
      context.orderBlueprint = orderBlueprint;
      console.log('[ORDER_FACTORY] ✓ Blueprint attached to execution context');
    }

    console.log('='.repeat(60));
    console.log(`[ORDER_FACTORY] ✓ Order created successfully`);
    console.log(`[ORDER_FACTORY] Order ID: ${result.orderId}`);
    console.log(`[ORDER_FACTORY] Strategy: ${result.strategy}`);
    console.log(`[ORDER_FACTORY] Duration: ${totalDuration}ms`);
    console.log('='.repeat(60) + '\n');

    return {
      ...result,
      totalDuration,
      blueprint: orderBlueprint
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('='.repeat(60));
    console.error('[ORDER_FACTORY] ✗ Order creation failed');
    console.error('[ORDER_FACTORY] Error:', error.message);
    console.error('='.repeat(60) + '\n');

    // Log failure
    logOrderCreation({
      type: orderBlueprint.type,
      strategy: 'unknown',
      duration,
      success: false,
      environment: context.environment?.name,
      blueprint: orderBlueprint,
      error
    });

    return {
      success: false,
      error: error.message,
      duration,
      blueprint: orderBlueprint
    };
  }
}

/**
 * Execute API strategy
 */
async function executeAPIStrategy(blueprint, context) {
  console.log('[ORDER_FACTORY] Executing API strategy...');
  return await createOrderViaAPI(blueprint, context);
}

/**
 * Execute UI strategy
 */
async function executeUIStrategy(blueprint, context) {
  console.log('[ORDER_FACTORY] Executing UI strategy...');
  return await createOrderViaUI(blueprint, context);
}

/**
 * Execute hybrid strategy (API + UI validation)
 * 
 * Flow:
 * 1. Create order via API (fast)
 * 2. Validate order visible in UI (reliable)
 * 3. Return order ID
 */
async function executeHybridStrategy(blueprint, context) {
  console.log('[ORDER_FACTORY] Executing HYBRID strategy (API + UI validation)...');

  const startTime = Date.now();

  try {
    // Step 1: Create via API
    console.log('[ORDER_FACTORY] Step 1/2: Creating order via API...');
    const apiResult = await createOrderViaAPI(blueprint, context);

    if (!apiResult.success) {
      console.log('[ORDER_FACTORY] API creation failed, falling back to UI...');
      return await createOrderViaUI(blueprint, { ...context, isFallback: true });
    }

    const orderId = apiResult.orderId;
    console.log(`[ORDER_FACTORY] API order created: ${orderId}`);

    // Step 2: Validate in UI
    console.log('[ORDER_FACTORY] Step 2/2: Validating order in UI...');
    const uiValidation = await validateOrderInUI(orderId, context);

    const duration = Date.now() - startTime;

    if (uiValidation.success) {
      console.log('[ORDER_FACTORY] ✓ Hybrid strategy successful');

      logOrderCreation({
        type: blueprint.type,
        strategy: 'hybrid',
        duration,
        success: true,
        orderId,
        environment: context.environment?.name,
        blueprint
      });

      return {
        success: true,
        orderId,
        strategy: 'hybrid',
        duration,
        apiResult,
        uiValidation
      };
    } else {
      console.warn('[ORDER_FACTORY] UI validation failed, but order exists');
      
      // Order created but validation failed - still return success
      return {
        success: true,
        orderId,
        strategy: 'hybrid',
        duration,
        warning: 'UI validation failed',
        apiResult,
        uiValidation
      };
    }

  } catch (error) {
    console.error('[ORDER_FACTORY] Hybrid strategy failed:', error.message);
    
    // Fallback to full UI creation
    console.log('[ORDER_FACTORY] Falling back to full UI creation...');
    return await createOrderViaUI(blueprint, { ...context, isFallback: true });
  }
}

/**
 * Validate order exists in UI
 */
async function validateOrderInUI(orderId, context) {
  const { page, flowComposer } = context;

  try {
    if (!page) {
      return { success: false, reason: 'No page available' };
    }

    console.log(`[ORDER_FACTORY] Validating order ${orderId} in UI...`);

    // If flow composer has validation flow, use it
    if (flowComposer && flowComposer.validateOrder) {
      return await flowComposer.validateOrder(orderId, { page });
    }

    // Basic validation: check if order ID appears anywhere
    const orderVisible = await page.locator(`text=${orderId}`).first().isVisible({ timeout: 5000 });

    return {
      success: orderVisible,
      orderId,
      method: 'basic'
    };

  } catch (error) {
    console.warn('[ORDER_FACTORY] UI validation error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate order blueprint
 */
function validateBlueprint(blueprint) {
  if (!blueprint) {
    throw new Error('Order blueprint is required');
  }

  if (!blueprint.type) {
    throw new Error('Order type is required');
  }

  const validTypes = ['rx', 'otc', 'mixed', 'b2b', 'corporate'];
  if (!validTypes.includes(blueprint.type)) {
    throw new Error(`Invalid order type: ${blueprint.type}. Must be one of: ${validTypes.join(', ')}`);
  }
}

module.exports = {
  createOrder,
  executeAPIStrategy,
  executeUIStrategy,
  executeHybridStrategy
};