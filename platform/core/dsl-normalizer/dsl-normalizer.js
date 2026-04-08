/**
 * DSL Normalizer
 * 
 * Main normalization engine that orchestrates the complete pipeline:
 * 
 *   Natural Language DSL
 *   → Tokenizer (structure extraction)
 *   → Action Normalizer (verb canonicalization)
 *   → Target Resolver (registry key lookup)
 *   → Parameter Extractor (value extraction)
 *   → Canonical Intent Step
 * 
 * Example transformation:
 *   Input:  "fill email with test@example.com"
 *   Output: { action: "fill", target: "email_input", value: "test@example.com" }
 * 
 * ARCHITECTURE CONTRACT:
 * - Preserves human readability in source
 * - Guarantees deterministic execution
 * - Registry-driven (no selector guessing)
 * - Phase-1 guarantees intact
 */

const { tokenize, tokenizeMany } = require('./tokenizer');
const { normalizeTokens, normalizeManyTokens } = require('./action-normalizer');
const { resolveTarget, resolveTargets } = require('./target-resolver');
const { extractParameters, extractManyParameters, buildStepObject } = require('./parameter-extractor');
const { loadLocatorRegistry } = require('../locator-registry-loader');

/**
 * Normalize a single natural language step
 * @param {string} step - Natural language step
 * @param {Object} registry - Locator registry
 * @param {Object} options - Options
 * @returns {Object} - Canonical intent step
 */
function normalizeStep(step, registry, options = {}) {
  const { strict = true } = options;

  // Phase 1: Tokenize (extract structure)
  const tokens = tokenize(step);

  // Phase 2: Normalize action (verb → canonical)
  const normalized = normalizeTokens(tokens, { strict });

  // Phase 3: Resolve target (object → registry key)
  const targetKey = resolveTarget(normalized, registry, options);
  const withTarget = {
    ...normalized,
    targetKey,
  };

  // Phase 4: Extract parameters (value extraction)
  const params = extractParameters(withTarget);

  // Phase 5: Build canonical step object
  const canonicalStep = buildStepObject(withTarget, params);

  return canonicalStep;
}

/**
 * Normalize multiple natural language steps
 * @param {string[]} steps - Array of natural language steps
 * @param {Object} registry - Locator registry
 * @param {Object} options - Options
 * @returns {Object[]} - Array of canonical intent steps
 */
function normalizeSteps(steps, registry, options = {}) {
  if (!Array.isArray(steps)) {
    throw new Error('DSLNormalizer: steps must be an array');
  }

  if (!registry || typeof registry !== 'object') {
    throw new Error('DSLNormalizer: registry must be an object');
  }

  return steps.map((step, index) => {
    try {
      return normalizeStep(step, registry, options);
    } catch (err) {
      throw new Error(
        `DSLNormalizer: Failed at step ${index + 1} ("${step}"): ${err.message}`
      );
    }
  });
}

/**
 * Normalize steps with automatic registry loading
 * @param {string[]} steps - Array of natural language steps
 * @param {string} service - Service name
 * @param {string} feature - Feature name
 * @param {Object} options - Options
 * @returns {Promise<Object[]>} - Array of canonical intent steps
 */
async function normalizeStepsWithRegistry(steps, service, feature, options = {}) {
  if (!service || typeof service !== 'string') {
    throw new Error('DSLNormalizer: service must be a non-empty string');
  }

  if (!feature || typeof feature !== 'string') {
    throw new Error('DSLNormalizer: feature must be a non-empty string');
  }

  // Load registry for service/feature
  const registry = await loadLocatorRegistry(service, feature);

  if (!registry || Object.keys(registry).length === 0) {
    throw new Error(
      `DSLNormalizer: No locator registry found for service="${service}" feature="${feature}". ` +
      `Create registry at: locator-registry/services/${service}/${feature}.yaml`
    );
  }

  // Normalize steps
  return normalizeSteps(steps, registry, options);
}

/**
 * Parse a complete flow (multi-line DSL text)
 * @param {string} flowText - Multi-line natural language flow
 * @param {Object} registry - Locator registry
 * @param {Object} options - Options
 * @returns {Object[]} - Array of canonical intent steps
 */
function parseFlow(flowText, registry, options = {}) {
  if (!flowText || typeof flowText !== 'string') {
    throw new Error('DSLNormalizer: flowText must be a non-empty string');
  }

  // Split into lines and clean
  const lines = flowText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.startsWith('#')); // Remove comments

  if (lines.length === 0) {
    throw new Error('DSLNormalizer: flowText contains no valid steps');
  }

  return normalizeSteps(lines, registry, options);
}

/**
 * Parse flow with automatic registry loading
 * @param {string} flowText - Multi-line natural language flow
 * @param {string} service - Service name
 * @param {string} feature - Feature name
 * @param {Object} options - Options
 * @returns {Promise<Object[]>} - Array of canonical intent steps
 */
async function parseFlowWithRegistry(flowText, service, feature, options = {}) {
  const registry = await loadLocatorRegistry(service, feature);
  return parseFlow(flowText, registry, options);
}

/**
 * Validate normalized steps
 * @param {Object[]} normalizedSteps - Array of canonical steps
 * @returns {Object} - Validation result
 */
function validate(normalizedSteps) {
  if (!Array.isArray(normalizedSteps)) {
    return {
      valid: false,
      error: 'normalizedSteps must be an array',
    };
  }

  const errors = [];

  for (let i = 0; i < normalizedSteps.length; i++) {
    const step = normalizedSteps[i];
    
    if (!step || typeof step !== 'object') {
      errors.push(`Step ${i + 1}: not an object`);
      continue;
    }

    if (!step.action || typeof step.action !== 'string') {
      errors.push(`Step ${i + 1}: missing or invalid action`);
    }

    // Action-specific validation
    if (['click', 'fill', 'check', 'uncheck', 'wait'].includes(step.action)) {
      if (!step.target) {
        errors.push(`Step ${i + 1}: ${step.action} requires a target`);
      }
    }

    if (['fill', 'type', 'select'].includes(step.action)) {
      if (!step.value) {
        errors.push(`Step ${i + 1}: ${step.action} requires a value`);
      }
    }

    if (['navigate', 'goto'].includes(step.action)) {
      if (!step.url) {
        errors.push(`Step ${i + 1}: ${step.action} requires a url`);
      }
    }

    if (step.action === 'include') {
      if (!step.flow) {
        errors.push(`Step ${i + 1}: include requires a flow name`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    stepCount: normalizedSteps.length,
  };
}

/**
 * Get normalization statistics
 * @param {string[]} originalSteps - Original natural language steps
 * @param {Object[]} normalizedSteps - Normalized canonical steps
 * @returns {Object} - Statistics
 */
function getStats(originalSteps, normalizedSteps) {
  return {
    inputSteps: originalSteps.length,
    outputSteps: normalizedSteps.length,
    uniqueActions: [...new Set(normalizedSteps.map(s => s.action))].length,
    uniqueTargets: [...new Set(normalizedSteps.map(s => s.target).filter(Boolean))].length,
    hasNavigation: normalizedSteps.some(s => s.action === 'navigate' || s.action === 'goto'),
    hasAssertions: false, // Assertions handled separately
  };
}

module.exports = {
  normalizeStep,
  normalizeSteps,
  normalizeStepsWithRegistry,
  parseFlow,
  parseFlowWithRegistry,
  validate,
  getStats,
};