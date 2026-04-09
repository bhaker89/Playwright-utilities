#!/usr/bin/env node

/**
 * CLI: Test Order Factory
 * 
 * Usage:
 *   node platform/cli/test-order-factory.js type=rx prescription=false
 *   node platform/cli/test-order-factory.js type=mixed split=true discount=coupon
 */

const { createOrder } = require('../domain/order-factory');
const { parseOrderBlueprint } = require('../core/dsl-normalizer/order-blueprint-parser');
const { FlowCompositionEngine } = require('../core/flow-composition-engine');
const { getSummary } = require('../domain/order-factory/telemetry');

async function testOrderFactory() {
  console.log('\n' + '='.repeat(70));
  console.log('ORDER FACTORY TEST CLI');
  console.log('='.repeat(70) + '\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node platform/cli/test-order-factory.js type=<type> [key=value...]');
    console.log('');
    console.log('Examples:');
    console.log('  node platform/cli/test-order-factory.js type=rx');
    console.log('  node platform/cli/test-order-factory.js type=rx prescription=false');
    console.log('  node platform/cli/test-order-factory.js type=otc split=true');
    console.log('  node platform/cli/test-order-factory.js type=mixed split=true discount=coupon source=paytm');
    console.log('');
    console.log('Order Types: rx, otc, mixed, b2b, corporate');
    console.log('');
    process.exit(1);
  }

  // Build DSL command from args
  const dslCommand = 'create order ' + args.join(' ');
  console.log('DSL Command:', dslCommand);
  console.log('');

  try {
    // Parse blueprint
    const blueprint = parseOrderBlueprint(dslCommand);
    console.log('Parsed Blueprint:');
    console.log(JSON.stringify(blueprint, null, 2));
    console.log('');

    // Setup context with mock API client (for testing without real API)
    const mockApiClient = {
      post: async (url, payload) => {
        console.log('[MOCK_API_CLIENT] POST', url);
        console.log('[MOCK_API_CLIENT] Payload:', JSON.stringify(payload, null, 2));
        return {
          status: 201,
          data: {
            orderId: `ORDER_${Date.now()}`,
            order_id: `ORDER_${Date.now()}`,
            message: 'Order created successfully (mock)'
          }
        };
      }
    };

    const context = {
      apiClient: mockApiClient, // Provide mock API client
      flowComposer: new FlowCompositionEngine(),
      environment: {
        name: process.env.TEST_ENV || 'qa',
        baseURL: 'https://api.example.com'
      },
      options: {
        // Force strategy if specified
        forceApi: process.env.FORCE_API === 'true',
        forceUi: process.env.FORCE_UI === 'true'
      }
    };

    // Execute order creation
    console.log('Executing OrderFactory...\n');
    const result = await createOrder(blueprint, context);

    // Display result
    console.log('\n' + '='.repeat(70));
    console.log('RESULT');
    console.log('='.repeat(70));
    console.log('Success:', result.success);
    
    // Verify context.orderBlueprint was set
    if (context.orderBlueprint) {
      console.log('Context Blueprint:', JSON.stringify(context.orderBlueprint, null, 2));
    }
    
    if (result.success) {
      console.log('Order ID:', result.orderId);
      console.log('Strategy:', result.strategy);
      console.log('Duration:', result.duration + 'ms');
      
      if (result.warning) {
        console.log('Warning:', result.warning);
      }
    } else {
      console.log('Error:', result.error);
    }
    console.log('='.repeat(70) + '\n');

    // Display telemetry summary
    console.log('TELEMETRY SUMMARY');
    console.log('='.repeat(70));
    const summary = getSummary();
    console.log(JSON.stringify(summary, null, 2));
    console.log('='.repeat(70) + '\n');

    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('ERROR');
    console.error('='.repeat(70));
    console.error(error.message);
    console.error('='.repeat(70) + '\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testOrderFactory().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { testOrderFactory };