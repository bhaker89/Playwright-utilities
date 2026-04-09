#!/usr/bin/env node

/**
 * Simple standalone test for Dataset Provider
 * 
 * Run: node tests/simple-dataset-test.js
 */

const { resolveDataset, validateResolvedDataset } = require('../platform/domain/dataset-provider');

async function runTests() {
  console.log('\n='.repeat(60));
  console.log('Dataset Provider Tests');
  console.log('='.repeat(60) + '\n');

  let passed = 0;
  let failed = 0;

  // Test 1: RX Order Dataset Resolution
  try {
    console.log('Test 1: RX Order Dataset Resolution');
    const enriched = await resolveDataset({ type: 'rx' }, { environment: 'test', city: 'mumbai' });
    
    if (enriched.dataset && enriched.dataset.sku === 'MED_RX_MUM_001') {
      console.log('  ✓ PASS: SKU resolved correctly\n');
      passed++;
    } else {
      console.log(`  ✗ FAIL: Expected SKU=MED_RX_MUM_001, got ${enriched.dataset?.sku}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ FAIL: ${error.message}\n`);
    failed++;
  }

  // Test 2: B2B Order Payment Resolution
  try {
    console.log('Test 2: B2B Order Payment Resolution');
    const enriched = await resolveDataset({ type: 'b2b' }, { environment: 'test' });
    
    if (enriched.dataset && enriched.dataset.payment.method === 'invoice') {
      console.log('  ✓ PASS: B2B payment method is invoice\n');
      passed++;
    } else {
      console.log(`  ✗ FAIL: Expected payment=invoice, got ${enriched.dataset?.payment?.method}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ FAIL: ${error.message}\n`);
    failed++;
  }

  // Test 3: Corporate Order Resolution
  try {
    console.log('Test 3: Corporate Order Resolution');
    const enriched = await resolveDataset({ type: 'corporate' }, { environment: 'test' });
    
    if (enriched.dataset && enriched.dataset.payment.method === 'corporate-credit') {
      console.log('  ✓ PASS: Corporate payment method is corporate-credit\n');
      passed++;
    } else {
      console.log(`  ✗ FAIL: Expected payment=corporate-credit, got ${enriched.dataset?.payment?.method}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ FAIL: ${error.message}\n`);
    failed++;
  }

  // Test 4: Team Override
  try {
    console.log('Test 4: Team Override');
    const enriched = await resolveDataset(
      { type: 'rx' },
      { environment: 'test', teamOverrides: { sku: 'CUSTOM_SKU' } }
    );
    
    if (enriched.dataset && enriched.dataset.sku === 'CUSTOM_SKU') {
      console.log('  ✓ PASS: Team override applied\n');
      passed++;
    } else {
      console.log(`  ✗ FAIL: Expected SKU=CUSTOM_SKU, got ${enriched.dataset?.sku}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ FAIL: ${error.message}\n`);
    failed++;
  }

  // Test 5: Dataset Validation
  try {
    console.log('Test 5: Dataset Validation');
    const enriched = await resolveDataset({ type: 'rx' }, { environment: 'test' });
    const validation = validateResolvedDataset(enriched.dataset);
    
    if (validation.valid && validation.errors.length === 0) {
      console.log('  ✓ PASS: Dataset validation successful\n');
      passed++;
    } else {
      console.log(`  ✗ FAIL: Dataset validation failed: ${validation.errors.join(', ')}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ FAIL: ${error.message}\n`);
    failed++;
  }

  // Test 6: Performance (<50ms)
  try {
    console.log('Test 6: Performance Check');
    const start = Date.now();
    await resolveDataset({ type: 'rx' }, { environment: 'test', city: 'mumbai' });
    const duration = Date.now() - start;
    
    if (duration < 50) {
      console.log(`  ✓ PASS: Resolution completed in ${duration}ms (< 50ms)\n`);
      passed++;
    } else {
      console.log(`  ✗ FAIL: Resolution took ${duration}ms (>= 50ms)\n`);
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ FAIL: ${error.message}\n`);
    failed++;
  }

  // Test 7: All Fields Resolved
  try {
    console.log('Test 7: All Required Fields Resolved');
    const enriched = await resolveDataset({ type: 'otc' }, { environment: 'test', city: 'bangalore' });
    const { dataset } = enriched;
    
    const allResolved = dataset.sku && dataset.vendor && dataset.address && dataset.payment && dataset.user;
    
    if (allResolved) {
      console.log('  ✓ PASS: All required fields resolved');
      console.log(`    - SKU: ${dataset.sku}`);
      console.log(`    - Vendor: ${dataset.vendor}`);
      console.log(`    - Address: ${dataset.address.city}`);
      console.log(`    - Payment: ${dataset.payment.method}`);
      console.log(`    - User: ${dataset.user.userId}\n`);
      passed++;
    } else {
      console.log('  ✗ FAIL: Some fields missing\n');
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ FAIL: ${error.message}\n`);
    failed++;
  }

  // Summary
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total: ${passed + failed}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});