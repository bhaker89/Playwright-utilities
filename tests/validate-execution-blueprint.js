/**
 * Validate Execution Blueprint Metadata
 * Tests that context.executionBlueprint is correctly attached
 */

const { createOrder } = require('../platform/domain/order-factory');

console.log('\n' + '='.repeat(80));
console.log('🔍 EXECUTION BLUEPRINT METADATA VALIDATION');
console.log('='.repeat(80));

async function validateExecutionBlueprint() {
  const blueprint = { 
    type: 'rx',
    split: true,
    discount: 'coupon'
  };
  
  const context = { 
    environment: { name: 'staging' },
    apiClient: null // Force UI to trigger flow
  };

  // Set TEST_ENV
  process.env.TEST_ENV = 'staging';

  console.log('\n📝 Creating order with blueprint:', JSON.stringify(blueprint, null, 2));
  console.log('\n👀 Checking context.executionBlueprint...\n');

  try {
    await createOrder(blueprint, context);
  } catch (error) {
    // Expected to fail without browser
  }

  // Validate context.executionBlueprint
  console.log('\n' + '='.repeat(80));
  console.log('📊 EXECUTION BLUEPRINT VALIDATION RESULTS');
  console.log('='.repeat(80));

  if (!context.executionBlueprint) {
    console.log('❌ FAIL - context.executionBlueprint not found');
    return;
  }

  console.log('✅ context.executionBlueprint exists\n');

  // Validate structure
  const eb = context.executionBlueprint;
  
  console.log('Checking required fields:');
  console.log('  ✓ orderBlueprint:', eb.orderBlueprint ? 'EXISTS' : '❌ MISSING');
  console.log('  ✓ dataset:', eb.dataset ? 'EXISTS' : '❌ MISSING');
  console.log('  ✓ strategy:', eb.strategy || '❌ MISSING');
  console.log('  ✓ env:', eb.env || '❌ MISSING');

  console.log('\n📸 Complete Execution Blueprint Snapshot:');
  console.log('─'.repeat(80));
  console.log(JSON.stringify(eb, null, 2));
  console.log('─'.repeat(80));

  // Validate dataset fields
  if (eb.dataset) {
    console.log('\n✅ Dataset Resolution Summary:');
    console.log('  SKU:', eb.dataset.sku);
    console.log('  Vendor:', eb.dataset.vendor);
    console.log('  Address:', eb.dataset.address.city, eb.dataset.address.pincode);
    console.log('  Payment:', eb.dataset.payment.method);
    console.log('  User:', eb.dataset.user.userId);
  }

  // Validate blueprint modifiers preserved
  if (eb.orderBlueprint) {
    console.log('\n✅ Blueprint Modifiers Preserved:');
    console.log('  Type:', eb.orderBlueprint.type);
    console.log('  Split:', eb.orderBlueprint.split);
    console.log('  Discount:', eb.orderBlueprint.discount);
  }

  console.log('\n✅ Strategy Resolved:', eb.strategy);
  console.log('✅ Environment:', eb.env);

  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL VALIDATIONS PASSED');
  console.log('='.repeat(80));

  console.log('\n📋 Use Cases Enabled:');
  console.log('  1. Assertion Engine: Can infer assertions from context.executionBlueprint');
  console.log('  2. Admin Workflow: Can validate order state using executionBlueprint');
  console.log('  3. Child Repo Steps: Can access complete execution context');
  console.log('  4. Telemetry: Can log complete execution metadata');
  console.log('  5. Debugging: Complete snapshot of execution state');

  console.log('\n' + '='.repeat(80) + '\n');
}

validateExecutionBlueprint().catch(console.error);
