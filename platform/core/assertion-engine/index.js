/**
 * Assertion Engine - Entry Module
 * 
 * Automatically injects assertions into intent steps BEFORE execution.
 * This is compile-time enrichment, not runtime mutation.
 * 
 * PIPELINE POSITION:
 * TXT DSL → normalization → registry resolution → **assertion injection** → intent spec → execution
 * 
 * PHILOSOPHY:
 * - Lean and simple
 * - Registry-driven assertions only (initially)
 * - No complex confidence scoring (keep it simple)
 * - Fail-fast validation
 * 
 * EXAMPLE:
 * Input:  click login-button
 * Output: click login-button
 *         assert dashboard-page visible
 */

const path = require('path');
const actionRules = require('./action-rules');

// Platform mode for logging
const PLATFORM_MODE = process.env.PLATFORM_MODE === 'true';

/**
 * Log assertion injection
 * @param {string} assertion - Assertion target
 * @param {string} source - Injection source (registry, action-rule, flow-meta)
 */
function logAssertion(assertion, source) {
  if (PLATFORM_MODE) {
    console.log(`[ASSERTION] injected ${assertion} source=${source}`);
  }
}

/**
 * Check if assertion already exists in steps
 * @param {Array} steps - Intent steps
 * @param {string} target - Assertion target
 * @param {number} afterIndex - Check after this index
 * @returns {boolean} - True if exists
 */
function assertionExists(steps, target, afterIndex) {
  if (!Array.isArray(steps) || afterIndex < 0) {
    return false;
  }

  // Check next 5 steps for duplicate
  const endIndex = Math.min(afterIndex + 6, steps.length);
  
  for (let i = afterIndex + 1; i < endIndex; i++) {
    const step = steps[i];
    if ((step.verb === 'assert' || step.verb === 'expect' || step.verb === 'verify') &&
        (step.object === target || step.targetKey === target)) {
      return true;
    }
  }

  return false;
}

/**
 * Create assertion step
 * @param {string} target - Assertion target
 * @param {string} source - Injection source
 * @returns {Object} - Assertion step
 */
function createAssertionStep(target, source) {
  return {
    verb: 'assert',
    object: target,
    targetKey: target,
    parameters: {
      state: 'visible',
      timeout: 5000,
    },
    metadata: {
      injected: true,
      source,
    },
  };
}

/**
 * Extract assertions from registry entry
 * @param {Object} registryEntry - Registry entry
 * @param {string} environment - Current environment
 * @returns {Array} - Array of assertion targets
 */
function extractRegistryAssertions(registryEntry, environment = null) {
  if (!registryEntry || !registryEntry.asserts) {
    return [];
  }

  const env = environment || process.env.TEST_ENV || 'default';
  const asserts = registryEntry.asserts;

  // Priority: environment-specific > success > default
  if (asserts[env]) {
    return Array.isArray(asserts[env]) ? asserts[env] : [asserts[env]];
  }
  
  if (asserts.success) {
    return Array.isArray(asserts.success) ? asserts.success : [asserts.success];
  }
  
  if (asserts.default) {
    return Array.isArray(asserts.default) ? asserts.default : [asserts.default];
  }

  return [];
}

/**
 * Find registry entry for target
 * @param {string} targetKey - Target key
 * @param {Object} registries - Loaded registries
 * @returns {Object|null} - Registry entry or null
 */
function findRegistryEntry(targetKey, registries) {
  if (!targetKey || !registries) {
    return null;
  }

  // Check in priority order
  const priorities = ['child', 'core', 'fallback'];
  
  for (const type of priorities) {
    if (registries[type] && registries[type][targetKey]) {
      return registries[type][targetKey];
    }
  }

  return null;
}

/**
 * Inject registry-driven assertions
 * @param {Array} steps - Intent steps
 * @param {Object} registries - Loaded registries
 * @param {Object} options - Options
 * @returns {Array} - Steps with injected assertions
 */
function injectRegistryAssertions(steps, registries, options = {}) {
  if (!Array.isArray(steps) || !registries) {
    return steps;
  }

  const { environment } = options;
  const enrichedSteps = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    enrichedSteps.push(step);

    // Skip if no target or is already an assertion
    if (!step.targetKey || step.verb === 'assert' || step.verb === 'expect') {
      continue;
    }

    // Find registry entry
    const registryEntry = findRegistryEntry(step.targetKey, registries);
    if (!registryEntry) {
      continue;
    }

    // Extract assertions
    const assertions = extractRegistryAssertions(registryEntry, environment);

    // Inject assertions
    for (const assertion of assertions) {
      // Handle both string and object assertion formats
      const target = typeof assertion === 'string' ? assertion : assertion.target;
      
      if (!target) {
        continue;
      }

      // Skip duplicates
      if (assertionExists(enrichedSteps, target, enrichedSteps.length - 1)) {
        continue;
      }

      // Create and inject assertion
      const assertionStep = createAssertionStep(target, 'registry');
      enrichedSteps.push(assertionStep);
      logAssertion(target, 'registry');
    }
  }

  return enrichedSteps;
}

/**
 * Inject action-rule-driven assertions
 * @param {Array} steps - Intent steps
 * @param {Object} options - Options
 * @returns {Array} - Steps with injected assertions
 */
function injectActionRuleAssertions(steps, options = {}) {
  if (!Array.isArray(steps)) {
    return steps;
  }

  const enrichedSteps = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    enrichedSteps.push(step);

    // Skip if no verb or is already an assertion
    if (!step.verb || step.verb === 'assert' || step.verb === 'expect') {
      continue;
    }

    // Match action rules
    const ruleAssertions = actionRules.matchRules(step);

    // Inject assertions
    for (const target of ruleAssertions) {
      // Skip duplicates
      if (assertionExists(enrichedSteps, target, enrichedSteps.length - 1)) {
        continue;
      }

      // Create and inject assertion
      const assertionStep = createAssertionStep(target, 'action-rule');
      enrichedSteps.push(assertionStep);
      logAssertion(target, 'action-rule');
    }
  }

  return enrichedSteps;
}

/**
 * Inject flow-level assertions
 * @param {Array} steps - Intent steps
 * @param {Object} flowMetadata - Flow metadata with assertions
 * @returns {Array} - Steps with injected assertions
 */
function injectFlowAssertions(steps, flowMetadata) {
  if (!Array.isArray(steps) || !flowMetadata || !flowMetadata.asserts) {
    return steps;
  }

  const enrichedSteps = [...steps];
  const assertions = Array.isArray(flowMetadata.asserts) ? flowMetadata.asserts : [flowMetadata.asserts];

  // Append flow assertions at the end
  for (const assertion of assertions) {
    const target = typeof assertion === 'string' ? assertion : assertion.target;
    
    if (!target) {
      continue;
    }

    // Skip duplicates
    if (assertionExists(enrichedSteps, target, 0)) {
      continue;
    }

    // Create and inject assertion
    const assertionStep = createAssertionStep(target, 'flow-meta');
    enrichedSteps.push(assertionStep);
    logAssertion(target, 'flow-meta');
  }

  return enrichedSteps;
}

/**
 * Main entry point: Inject assertions into intent steps
 * 
 * @param {Array} steps - Canonical intent steps (after normalization and registry resolution)
 * @param {Object} context - Injection context
 * @param {Object} context.registries - Loaded locator registries
 * @param {Object} context.flowMetadata - Optional flow-level metadata
 * @param {Object} options - Options
 * @param {string} options.environment - Target environment
 * @returns {Array} - Steps enriched with assertions
 */
function injectAssertions(steps, context = {}, options = {}) {
  if (!Array.isArray(steps)) {
    throw new Error('AssertionEngine: steps must be an array');
  }

  let enrichedSteps = [...steps];

  // Step 1: Inject registry-driven assertions
  if (context.registries) {
    enrichedSteps = injectRegistryAssertions(enrichedSteps, context.registries, options);
  }

  // Step 2: Inject action-rule assertions
  enrichedSteps = injectActionRuleAssertions(enrichedSteps, options);

  // Step 3: Inject flow-level assertions
  if (context.flowMetadata) {
    enrichedSteps = injectFlowAssertions(enrichedSteps, context.flowMetadata);
  }

  if (PLATFORM_MODE) {
    const injectedCount = enrichedSteps.length - steps.length;
    console.log(`[ASSERTION] Injected ${injectedCount} assertions into ${steps.length} steps`);
  }

  return enrichedSteps;
}

module.exports = {
  injectAssertions,
  injectRegistryAssertions,
  injectActionRuleAssertions,
  injectFlowAssertions,
  extractRegistryAssertions,
  assertionExists,
};