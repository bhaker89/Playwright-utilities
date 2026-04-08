const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Doctor Command - Environment & Configuration Validator
 * 
 * PHASE 4: Validates execution pipeline integrity
 * 
 * Checks:
 * - Environment configuration
 * - Registry loading
 * - DSL syntax validation
 * - Service config mapping
 * - Locator availability
 * - Playwright installation
 * - Execution path integrity
 */

async function runDoctor() {
  const checks = [];
  let allPassed = true;

  // Check 1: Node.js version
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion >= 16) {
      checks.push({ name: 'Node.js Version', status: '✓', detail: nodeVersion });
    } else {
      checks.push({ name: 'Node.js Version', status: '✗', detail: `${nodeVersion} (requires >= 16)` });
      allPassed = false;
    }
  } catch (error) {
    checks.push({ name: 'Node.js Version', status: '✗', detail: error.message });
    allPassed = false;
  }

  // Check 2: Playwright installation
  try {
    const playwrightPath = require.resolve('@playwright/test');
    checks.push({ name: 'Playwright Installation', status: '✓', detail: 'Installed' });
  } catch (error) {
    checks.push({ name: 'Playwright Installation', status: '✗', detail: 'Not found' });
    allPassed = false;
  }

  // Check 3: Environment config
  try {
    const envPath = path.resolve(__dirname, '../../config/.env.stag');
    if (fs.existsSync(envPath)) {
      checks.push({ name: 'Environment Config', status: '✓', detail: '.env.stag found' });
    } else {
      checks.push({ name: 'Environment Config', status: '⚠', detail: '.env.stag not found (optional)' });
    }
  } catch (error) {
    checks.push({ name: 'Environment Config', status: '✗', detail: error.message });
  }

  // Check 4: Service configuration
  try {
    const { ServiceConfigLoader } = require('../core/service-config-loader');
    const loader = new ServiceConfigLoader();
    await loader.loadConfig();
    const services = loader.getAllServices();
    checks.push({ name: 'Service Config', status: '✓', detail: `${services.length} service(s) loaded` });
  } catch (error) {
    checks.push({ name: 'Service Config', status: '✗', detail: error.message });
    allPassed = false;
  }

  // Check 5: Locator registry directory
  try {
    const registryPath = path.resolve(__dirname, '../../locator-registry');
    if (fs.existsSync(registryPath)) {
      const services = fs.readdirSync(registryPath).filter(f => fs.statSync(path.join(registryPath, f)).isDirectory());
      checks.push({ name: 'Locator Registry', status: '✓', detail: `${services.length} service(s) registered` });
    } else {
      checks.push({ name: 'Locator Registry', status: '⚠', detail: 'Directory not found (will be created on first ground-spec)' });
    }
  } catch (error) {
    checks.push({ name: 'Locator Registry', status: '✗', detail: error.message });
  }

  // Check 6: DSL Normalizer
  try {
    const { DSLNormalizer } = require('../core/dsl-normalizer');
    const normalizer = new DSLNormalizer();
    checks.push({ name: 'DSL Normalizer', status: '✓', detail: 'Loaded successfully' });
  } catch (error) {
    checks.push({ name: 'DSL Normalizer', status: '✗', detail: error.message });
    allPassed = false;
  }

  // Check 7: Intent Runner
  try {
    const { runIntentSpec } = require('../core/intent-runner');
    checks.push({ name: 'Intent Runner', status: '✓', detail: 'Kernel entrypoint accessible' });
  } catch (error) {
    checks.push({ name: 'Intent Runner', status: '✗', detail: error.message });
    allPassed = false;
  }

  // Check 8: LocatorOrchestrator
  try {
    const LocatorOrchestrator = require('../../framework/locator-intelligence/locator-orchestrator');
    checks.push({ name: 'LocatorOrchestrator', status: '✓', detail: 'LIE system available' });
  } catch (error) {
    checks.push({ name: 'LocatorOrchestrator', status: '✗', detail: error.message });
    allPassed = false;
  }

  // Check 9: Execution mode
  try {
    const executionMode = process.env.LIE_EXECUTION_MODE || 'PLATFORM';
    if (executionMode === 'PLATFORM') {
      checks.push({ name: 'Execution Mode', status: '✓', detail: 'PLATFORM (healing enabled)' });
    } else {
      checks.push({ name: 'Execution Mode', status: '⚠', detail: `${executionMode} (recommend PLATFORM)` });
    }
  } catch (error) {
    checks.push({ name: 'Execution Mode', status: '✗', detail: error.message });
  }

  // Check 10: Action Dictionary
  try {
    const { loadActionDictionary } = require('../core/action-dictionary');
    const dictionary = loadActionDictionary();
    const actionCount = Object.keys(dictionary).length;
    checks.push({ name: 'Action Dictionary', status: '✓', detail: `${actionCount} canonical action(s)` });
  } catch (error) {
    checks.push({ name: 'Action Dictionary', status: '✗', detail: error.message });
    allPassed = false;
  }

  // Print results
  console.log('Environment Health Check Results:');
  console.log('='.repeat(80));
  checks.forEach(check => {
    const statusIcon = check.status;
    const padding = ' '.repeat(Math.max(0, 30 - check.name.length));
    console.log(`${statusIcon} ${check.name}${padding}${check.detail}`);
  });
  console.log('='.repeat(80));

  if (allPassed) {
    console.log('\n✅ All critical checks passed. System ready for execution.');
    console.log('\n📋 Recommended flow:');
    console.log('   1. Write TXT DSL flow → flows/my-flow.txt');
    console.log('   2. Generate intent spec → npm run generate-from-dsl flows/my-flow.txt');
    console.log('   3. Ground spec → npm run ground-spec');
    console.log('   4. Execute → npm run run-intent specs/my-flow.intent.yaml');
  } else {
    console.log('\n❌ Some checks failed. Review errors above and fix configuration.');
    throw new Error('Doctor check failed');
  }
}

module.exports = { runDoctor };