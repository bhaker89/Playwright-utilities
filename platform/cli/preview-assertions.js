#!/usr/bin/env node

/**
 * Assertion Preview CLI
 * 
 * Command: npm run preview-assertions <flow-file>
 * 
 * Previews a flow with injected assertions WITHOUT executing it.
 * Shows what assertions would be automatically added.
 * 
 * Example:
 *   npm run preview-assertions flows/order/place-order.txt
 * 
 * Output:
 *   Original steps + injected assertions (annotated)
 */

const fs = require('fs');
const path = require('path');

const { resolveFromRoot } = require('../core/workspace-root');
const assertionEngine = require('../core/assertion-engine');
const { loadFlowMetadata } = require('../core/assertion-engine/flow-metadata-loader');
const { loadAllRegistries } = require('../core/locator-registry-loader');
const dslNormalizer = require('../core/dsl-normalizer');

/**
 * Read flow file
 */
function readFlowFile(flowPath) {
  const absolutePath = path.isAbsolute(flowPath) ? flowPath : resolveFromRoot(flowPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Flow file not found: ${flowPath}`);
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

/**
 * Format step for display
 */
function formatStep(step, index, isInjected = false) {
  const prefix = isInjected ? '  +' : `${String(index + 1).padStart(3)}.`;
  const source = step.metadata?.source ? ` [${step.metadata.source}]` : '';
  const injectedMarker = isInjected ? ' ← INJECTED' : '';
  
  let stepText = '';
  
  if (step.verb && step.object) {
    stepText = `${step.verb} ${step.object}`;
    
    if (step.parameters) {
      const params = Object.entries(step.parameters)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      if (params) {
        stepText += ` (${params})`;
      }
    }
  } else {
    stepText = JSON.stringify(step);
  }

  return `${prefix} ${stepText}${source}${injectedMarker}`;
}

/**
 * Preview flow with assertions
 */
async function previewFlow(flowPath, options = {}) {
  console.log('\n🔍 Assertion Injection Preview\n');
  console.log('='.repeat(60));
  console.log(`Flow: ${flowPath}\n`);

  // Read flow
  const flowContent = readFlowFile(flowPath);
  const lines = flowContent.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

  console.log('📄 Original Flow:\n');
  lines.forEach((line, i) => {
    console.log(`  ${String(i + 1).padStart(3)}. ${line}`);
  });

  // Parse flow (simplified - normally would go through full pipeline)
  console.log('\n⚙️  Processing...\n');
  
  // Normalize DSL with registry
  const service = options.service || '1mg-web';
  const feature = options.feature || 'auth';
  
  const normalized = await dslNormalizer.normalizeStepsWithRegistry(lines, service, feature);
  console.log(`✓ Normalized ${normalized.length} steps`);

  // Load registries for assertion injection
  const registries = await loadAllRegistries(service, feature);
  console.log('✓ Loaded registries');

  // Load flow metadata
  const flowMetadata = loadFlowMetadata(flowPath);
  if (flowMetadata) {
    console.log('✓ Loaded flow metadata');
  }

  // Inject assertions
  const enriched = assertionEngine.injectAssertions(normalized, {
    registries,
    flowMetadata,
  });

  console.log(`✓ Injected ${enriched.length - normalized.length} assertions\n`);

  // Display enriched flow
  console.log('='.repeat(60));
  console.log('\n✨ Flow with Injected Assertions:\n');

  let displayIndex = 0;
  for (const step of enriched) {
    const isInjected = step.metadata?.injected === true;
    console.log(formatStep(step, displayIndex, isInjected));
    if (!isInjected) {
      displayIndex++;
    }
  }

  // Statistics
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Injection Statistics:\n');
  
  const injectedSteps = enriched.filter(s => s.metadata?.injected === true);
  const sources = {
    registry: injectedSteps.filter(s => s.metadata.source === 'registry').length,
    'action-rule': injectedSteps.filter(s => s.metadata.source === 'action-rule').length,
    'flow-meta': injectedSteps.filter(s => s.metadata.source === 'flow-meta').length,
  };

  console.log(`  Original steps: ${normalized.length}`);
  console.log(`  Injected assertions: ${injectedSteps.length}`);
  console.log(`  Total steps: ${enriched.length}`);
  console.log('\n  By source:');
  Object.entries(sources).forEach(([source, count]) => {
    if (count > 0) {
      console.log(`    - ${source}: ${count}`);
    }
  });

  console.log('\n✅ Preview complete!\n');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n❌ Usage: npm run preview-assertions <flow-file>\n');
    console.log('Example:');
    console.log('  npm run preview-assertions flows/order/place-order.txt\n');
    process.exit(1);
  }

  const flowPath = args[0];
  const options = {
    service: process.env.SERVICE,
    feature: process.env.FEATURE,
  };

  try {
    await previewFlow(flowPath, options);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Preview failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { previewFlow };