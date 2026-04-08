#!/usr/bin/env node

/**
 * Generate Intent Spec from Natural Language DSL
 * 
 * Usage:
 *   node platform/cli/generate-from-dsl.js \
 *     --service=1mg-web \
 *     --feature=quick_order \
 *     --input=flows/my-flow.txt
 * 
 * Or inline:
 *   node platform/cli/generate-from-dsl.js \
 *     --service=1mg-web \
 *     --feature=quick_order \
 *     --steps="navigate to /login" \
 *     --steps="fill email with test@example.com" \
 *     --steps="click login button"
 * 
 * Example flow file (flows/my-flow.txt):
 *   # Login flow
 *   navigate to https://example.com/login
 *   fill email with test@example.com
 *   fill password with secretPass123
 *   click submit button
 *   wait for dashboard
 */

const fs = require('fs');
const path = require('path');
const { generateIntentSpecFromDSL } = require('../generators/prompt-to-intent-spec-generator');
const { resolveFromRoot } = require('../core/workspace-root');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    service: null,
    feature: null,
    input: null,
    output: null,
    steps: [],
    metadata: {},
  };

  for (const arg of args) {
    if (arg.startsWith('--service=')) {
      options.service = arg.substring(10);
    } else if (arg.startsWith('--feature=')) {
      options.feature = arg.substring(10);
    } else if (arg.startsWith('--input=')) {
      options.input = arg.substring(8);
    } else if (arg.startsWith('--output=')) {
      options.output = arg.substring(9);
    } else if (arg.startsWith('--steps=')) {
      options.steps.push(arg.substring(8));
    } else if (arg.startsWith('--name=')) {
      options.metadata.testSuiteName = arg.substring(7);
    } else if (arg.startsWith('--description=')) {
      options.metadata.description = arg.substring(14);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Generate Intent Spec from Natural Language DSL

USAGE:
  node platform/cli/generate-from-dsl.js [OPTIONS]

OPTIONS:
  --service=<name>        Service name (required)
  --feature=<name>        Feature name (required)
  --input=<file>          Input file with DSL steps (one per line)
  --output=<file>         Output YAML file path (optional)
  --steps="<step>"        Inline step (can be repeated)
  --name=<name>           Test suite name (optional)
  --description=<desc>    Description (optional)
  --help, -h              Show this help

EXAMPLES:
  # From file
  node platform/cli/generate-from-dsl.js \\
    --service=1mg-web \\
    --feature=quick_order \\
    --input=flows/quick-order.txt

  # Inline steps
  node platform/cli/generate-from-dsl.js \\
    --service=1mg-web \\
    --feature=auth \\
    --steps="navigate to /login" \\
    --steps="fill email with test@example.com" \\
    --steps="click login button"

DSL SYNTAX:
  Natural language format:
    navigate to <url>
    fill <target> with <value>
    click <target>
    wait for <target>
    select <target> with <value>
    check <target>
    uncheck <target>
    include <flow-name>

  Synonyms supported:
    fill/enter/type/input
    click/tap/press
    navigate/go/goto/open
    
  Comments:
    Lines starting with # are ignored
  `);
}

async function main() {
  const options = parseArgs();

  // Validate required options
  if (!options.service) {
    console.error('Error: --service is required');
    printHelp();
    process.exit(1);
  }

  if (!options.feature) {
    console.error('Error: --feature is required');
    printHelp();
    process.exit(1);
  }

  // Get steps from file or inline
  let steps = [];
  
  if (options.input) {
    const inputPath = path.resolve(options.input);
    
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input file not found: ${inputPath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(inputPath, 'utf8');
    steps = fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.startsWith('#')); // Remove comments
  } else if (options.steps.length > 0) {
    steps = options.steps;
  } else {
    console.error('Error: Either --input or --steps is required');
    printHelp();
    process.exit(1);
  }

  if (steps.length === 0) {
    console.error('Error: No valid steps found');
    process.exit(1);
  }

  console.log(`\n🚀 Generating Intent Spec from DSL...`);
  console.log(`   Service: ${options.service}`);
  console.log(`   Feature: ${options.feature}`);
  console.log(`   Steps: ${steps.length}`);
  console.log('');

  try {
    const result = await generateIntentSpecFromDSL({
      steps,
      service: options.service,
      feature: options.feature,
      outputPath: options.output,
      metadata: options.metadata,
    });

    console.log('✅ Intent spec generated successfully!\n');
    console.log(`   Output: ${result.outputPath}`);
    console.log(`   Normalized steps: ${result.normalizedSteps.length}`);
    console.log('');
    console.log('📋 Generated steps:');
    result.normalizedSteps.forEach((step, i) => {
      console.log(`   ${i + 1}. ${step.action}${step.target ? ` → ${step.target}` : ''}${step.value ? ` = ${step.value}` : ''}${step.url ? ` → ${step.url}` : ''}`);
    });
    console.log('');
    console.log('🎯 Next steps:');
    console.log(`   1. Review: ${result.outputPath}`);
    console.log(`   2. Ground: node platform/cli/ground-spec.js --spec=${result.outputPath}`);
    console.log(`   3. Run: node platform/cli/run-intent.js --spec=${result.outputPath}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Generation failed:');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('registry')) {
      console.error('💡 Tip: Ensure locator registry exists:');
      console.error(`   locator-registry/services/${options.service}/${options.feature}.yaml\n`);
    }
    
    process.exit(1);
  }
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});