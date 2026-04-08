/**
 * DSL Normalizer Module
 * 
 * Exports all normalization layer components.
 * 
 * USAGE:
 * 
 * Simple usage (with registry object):
 *   const { normalizeStep } = require('./dsl-normalizer');
 *   const step = normalizeStep("fill email with test@example.com", registry);
 * 
 * With automatic registry loading:
 *   const { normalizeStepsWithRegistry } = require('./dsl-normalizer');
 *   const steps = await normalizeStepsWithRegistry(
 *     ["fill email with test@example.com", "click login button"],
 *     "1mg-web",
 *     "quick_order"
 *   );
 * 
 * Parse complete flow:
 *   const { parseFlowWithRegistry } = require('./dsl-normalizer');
 *   const flowText = `
 *     navigate to /login
 *     fill email with test@example.com
 *     click login button
 *   `;
 *   const steps = await parseFlowWithRegistry(flowText, "my-service", "auth");
 */

// Main normalizer
const dslNormalizer = require('./dsl-normalizer');

// Individual components (for advanced usage)
const tokenizer = require('./tokenizer');
const actionNormalizer = require('./action-normalizer');
const targetResolver = require('./target-resolver');
const parameterExtractor = require('./parameter-extractor');

// Export main functions
module.exports = {
  // Main API
  normalizeStep: dslNormalizer.normalizeStep,
  normalizeSteps: dslNormalizer.normalizeSteps,
  normalizeStepsWithRegistry: dslNormalizer.normalizeStepsWithRegistry,
  parseFlow: dslNormalizer.parseFlow,
  parseFlowWithRegistry: dslNormalizer.parseFlowWithRegistry,
  validate: dslNormalizer.validate,
  getStats: dslNormalizer.getStats,

  // Component APIs (advanced usage)
  tokenizer,
  actionNormalizer,
  targetResolver,
  parameterExtractor,
};