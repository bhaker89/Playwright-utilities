/**
 * Order-Aware Intent Spec Generator
 * 
 * Extends prompt-to-intent-spec-generator with OrderFactory integration
 * 
 * Pipeline:
 *   DSL Steps
 *   → Detect "create order" commands
 *   → OrderFactory execution
 *   → Capture orderId in context
 *   → Continue with normal DSL flow
 *   → Assertion injection
 *   → Intent spec generation
 * 
 * Usage:
 *   const { generateIntentSpecWithOrderSupport } = require('./order-aware-intent-generator');
 *   
 *   await generateIntentSpecWithOrderSupport({
 *     steps: [
 *       'create order type=rx prescription=false',
 *       'validate order visible in admin portal'
 *     ],
 *     service: 'admin-portal',
 *     feature: 'order_management',
 *     context: { page, apiClient, environment }
 *   });
 */

const { generateIntentSpecFromDSL } = require('./prompt-to-intent-spec-generator');
const { normalizeStepsWithRegistry } = require('../core/dsl-normalizer');
const { isOrderCreationCommand, parseOrderBlueprint } = require('../core/dsl-normalizer/order-blueprint-parser');
const { createOrder } = require('../domain/order-factory');
const { FlowCompositionEngine } = require('../core/flow-composition-engine');

/**
 * Generate intent spec with order creation support
 * 
 * @param {Object} options
 * @param {string[]} options.steps - DSL steps (may include "create order" commands)
 * @param {string} options.service - Service name
 * @param {string} options.feature - Feature name
 * @param {Object} options.context - Execution context
 * @param {Object} options.context.page - Playwright page (for UI strategy)
 * @param {Object} options.context.apiClient - HTTP client (for API strategy)
 * @param {Object} options.context.environment - Environment config
 * @param {string} options.outputPath - Output path for spec
 * @param {Object} options.metadata - Additional metadata
 * @returns {Promise<Object>}
 */
async function generateIntentSpecWithOrderSupport(options) {
  const {
    steps,
    service,
    feature,
    context = {},
    outputPath,
    metadata = {},
  } = options;

  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('Order-aware generation requires non-empty steps array');
  }

  console.log('\n' + '='.repeat(70));
  console.log('[ORDER_AWARE_GENERATOR] Processing steps with order support...');
  console.log('='.repeat(70));

  // Initialize execution context for order creation
  const executionContext = {
    ...context,
    orderIds: [],
    flowComposer: new FlowCompositionEngine(),
    // Store created orders for downstream steps
    createdOrders: [],
  };

  // Process steps and detect order creation commands
  const processedSteps = [];
  const orderCreationResults = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`\n[ORDER_AWARE_GENERATOR] Processing step ${i + 1}/${steps.length}: ${step}`);

    // Check if this is an order creation command
    if (isOrderCreationCommand(step)) {
      console.log('[ORDER_AWARE_GENERATOR] Detected order creation command');

      try {
        // Parse order blueprint
        const blueprint = parseOrderBlueprint(step);
        console.log('[ORDER_AWARE_GENERATOR] Parsed blueprint:', JSON.stringify(blueprint, null, 2));

        // Execute order creation through OrderFactory
        console.log('[ORDER_AWARE_GENERATOR] Executing OrderFactory...');
        const result = await createOrder(blueprint, executionContext);

        if (result.success) {
          console.log(`[ORDER_AWARE_GENERATOR] ✓ Order created: ${result.orderId}`);

          // Store order ID in context for downstream steps
          executionContext.orderIds.push(result.orderId);
          executionContext.createdOrders.push({
            orderId: result.orderId,
            blueprint,
            strategy: result.strategy,
            stepIndex: i
          });

          // Store in execution context for assertions
          executionContext.orderId = result.orderId; // Most recent order

          orderCreationResults.push({
            step,
            orderId: result.orderId,
            strategy: result.strategy,
            duration: result.duration
          });

          // Add step to track order creation in intent spec
          processedSteps.push({
            action: 'create_order',
            orderType: blueprint.type,
            orderId: result.orderId,
            strategy: result.strategy,
            metadata: {
              blueprint,
              result
            }
          });
        } else {
          throw new Error(`Order creation failed: ${result.error}`);
        }

      } catch (error) {
        console.error(`[ORDER_AWARE_GENERATOR] ✗ Order creation failed:`, error.message);
        throw new Error(`Order creation failed at step ${i + 1}: ${error.message}`);
      }

    } else {
      // Regular DSL step - pass through
      processedSteps.push(step);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('[ORDER_AWARE_GENERATOR] Order creation phase complete');
  console.log(`[ORDER_AWARE_GENERATOR] Created ${executionContext.orderIds.length} order(s)`);
  console.log('='.repeat(70) + '\n');

  // Now generate intent spec with processed steps
  console.log('[ORDER_AWARE_GENERATOR] Generating intent spec...');

  const result = await generateIntentSpecFromDSL({
    steps: processedSteps,
    service,
    feature,
    outputPath,
    metadata: {
      ...metadata,
      // Include order creation metadata
      orderCreation: {
        enabled: true,
        ordersCreated: executionContext.orderIds.length,
        orderIds: executionContext.orderIds,
        results: orderCreationResults
      },
      // Pass execution context for downstream use
      executionContext: {
        orderIds: executionContext.orderIds,
        orderId: executionContext.orderId, // Most recent
        createdOrders: executionContext.createdOrders
      }
    }
  });

  console.log('[ORDER_AWARE_GENERATOR] ✓ Intent spec generated successfully');
  console.log('[ORDER_AWARE_GENERATOR] Output:', result.outputPath);

  return {
    ...result,
    orderCreationResults,
    executionContext
  };
}

/**
 * Simpler API: Generate and execute DSL flow with order support
 * 
 * @param {Object} options
 * @param {string[]} options.steps - DSL steps
 * @param {string} options.service - Service name
 * @param {string} options.feature - Feature name
 * @param {Object} options.context - Execution context
 * @returns {Promise<Object>} Execution result with order IDs
 */
async function executeDSLFlowWithOrders(options) {
  const {
    steps,
    service,
    feature,
    context = {}
  } = options;

  console.log('[DSL_FLOW_EXECUTOR] Executing DSL flow with order support...');

  // Initialize execution context
  const executionContext = {
    ...context,
    orderIds: [],
    flowComposer: new FlowCompositionEngine(),
    createdOrders: [],
  };

  const results = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Check if this is an order creation command
    if (isOrderCreationCommand(step)) {
      const blueprint = parseOrderBlueprint(step);
      const result = await createOrder(blueprint, executionContext);

      if (result.success) {
        executionContext.orderIds.push(result.orderId);
        executionContext.orderId = result.orderId;
        executionContext.createdOrders.push({
          orderId: result.orderId,
          blueprint,
          strategy: result.strategy
        });
      }

      results.push({ step, result });
    } else {
      // Execute regular DSL step
      // This would integrate with the action executor
      results.push({ step, result: { success: true } });
    }
  }

  return {
    success: true,
    results,
    executionContext
  };
}

module.exports = {
  generateIntentSpecWithOrderSupport,
  executeDSLFlowWithOrders
};