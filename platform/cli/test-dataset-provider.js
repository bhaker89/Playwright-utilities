#!/usr/bin/env node

/**
 * Test Dataset Provider CLI
 * 
 * Tests the dataset provider with various order types and scenarios
 * 
 * Usage:
 *   npm run test-dataset-provider
 *   node platform/cli/test-dataset-provider.js
 *   node platform/cli/test-dataset-provider.js --type rx
 *   node platform/cli/test-dataset-provider.js --type b2b --env staging
 */

const { resolveDataset } = require('../domain/dataset-provider');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

/**
 * Main test function
 */
async function testDatasetProvider() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Dataset Provider Test CLI');
  console.log('='.repeat(60) + '\n');

  const args = process.argv.slice(2);
  const orderType = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'rx';
  const environment = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'test';
  const city = args.find(arg => arg.startsWith('--city='))?.split('=')[1] || 'mumbai';

  const testScenarios = [
    {
      name: 'RX Order (Default)',
      blueprint: { type: 'rx', prescription: true },
      context: { environment: 'test', city: 'mumbai' }
    },
    {
      name: 'OTC Order',
      blueprint: { type: 'otc', prescription: false },
      context: { environment: 'test', city: 'bangalore' }
    },
    {
      name: 'B2B Order with Corporate User',
      blueprint: { type: 'b2b', prescription: false },
      context: { environment: 'staging', city: 'mumbai' }
    },
    {
      name: 'Corporate Order',
      blueprint: { type: 'corporate', prescription: false },
      context: { environment: 'prod', city: 'mumbai' }
    },
    {
      name: 'Mixed Order with Split',
      blueprint: { type: 'mixed', split: true },
      context: { environment: 'test', city: 'delhi' }
    },
    {
      name: 'RX Order with Team Override',
      blueprint: { type: 'rx', prescription: true },
      context: {
        environment: 'test',
        city: 'mumbai',
        teamOverrides: {
          sku: 'TEAM_CUSTOM_SKU_001'
        }
      }
    }
  ];

  // If specific type provided, test only that
  if (args.find(arg => arg.startsWith('--type='))) {
    const scenario = {
      name: `Custom: ${orderType} order`,
      blueprint: { type: orderType },
      context: { environment, city }
    };
    await runTestScenario(scenario);
  } else {
    // Run all scenarios
    for (const scenario of testScenarios) {
      await runTestScenario(scenario);
      console.log('\n' + '-'.repeat(60) + '\n');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`${colors.green}✓ All dataset provider tests complete${colors.reset}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Run a single test scenario
 */
async function runTestScenario(scenario) {
  console.log(`${colors.blue}Test Scenario: ${scenario.name}${colors.reset}`);
  console.log(`Blueprint: ${JSON.stringify(scenario.blueprint, null, 2)}`);
  console.log(`Context: ${JSON.stringify(scenario.context, null, 2)}`);

  try {
    const startTime = Date.now();
    const enrichedBlueprint = await resolveDataset(scenario.blueprint, scenario.context);
    const duration = Date.now() - startTime;

    console.log(`\n${colors.green}✓ Resolution successful (${duration}ms)${colors.reset}`);
    console.log('\nResolved Dataset:');
    console.log(JSON.stringify(enrichedBlueprint.dataset, null, 2));

    // Validate resolution
    validateResolution(enrichedBlueprint);

  } catch (error) {
    console.error(`${colors.red}✗ Resolution failed: ${error.message}${colors.reset}`);
    console.error(error.stack);
  }
}

/**
 * Validate resolution result
 */
function validateResolution(enrichedBlueprint) {
  const { dataset } = enrichedBlueprint;
  
  if (!dataset) {
    throw new Error('No dataset in enriched blueprint');
  }

  const checks = [
    { field: 'sku', value: dataset.sku },
    { field: 'vendor', value: dataset.vendor },
    { field: 'address', value: dataset.address },
    { field: 'payment', value: dataset.payment },
    { field: 'user', value: dataset.user }
  ];

  console.log('\nValidation:');
  for (const check of checks) {
    if (check.value) {
      console.log(`  ${colors.green}✓${colors.reset} ${check.field}: resolved`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${check.field}: missing`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  testDatasetProvider().catch(error => {
    console.error(`${colors.red}✗ Fatal error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = {
  testDatasetProvider,
  runTestScenario
};