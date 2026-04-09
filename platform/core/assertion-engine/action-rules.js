/**
 * Lightweight Action-Level Assertion Rules
 * 
 * Defines simple pattern-based rules for core platform actions.
 * Only supports essential actions initially: navigate, search, submit, select.
 * 
 * PHILOSOPHY:
 * - Keep it simple
 * - Pattern-based matching
 * - Core actions only
 * - Easy to extend
 */

const PLATFORM_MODE = process.env.PLATFORM_MODE === 'true';

/**
 * Core action rules
 * Maps action patterns to expected assertions
 */
const ACTION_RULES = {
  // Navigate assertions
  navigate: [
    { pattern: /login|signin|sign-in/i, asserts: ['login-form-visible'] },
    { pattern: /dashboard|home/i, asserts: ['dashboard-page-visible'] },
    { pattern: /search/i, asserts: ['search-box-visible'] },
    { pattern: /checkout|cart/i, asserts: ['cart-items-visible'] },
    { pattern: /profile|account/i, asserts: ['profile-page-visible'] },
  ],

  // Search assertions
  search: [
    { pattern: /.*/, asserts: ['search-results-visible'] },
  ],

  // Submit assertions
  submit: [
    { pattern: /form|login|signup/i, asserts: ['form-submitted-visible'] },
  ],

  // Select assertions  
  select: [
    { pattern: /.*/, asserts: [] }, // Placeholder for future
  ],
};

/**
 * Match action rules against step
 * @param {Object} step - Intent step
 * @returns {Array} - Array of assertion targets
 */
function matchRules(step) {
  if (!step || !step.verb) {
    return [];
  }

  const verb = step.verb.toLowerCase();
  const rules = ACTION_RULES[verb];

  if (!rules) {
    return [];
  }

  // Build search text from step
  const searchText = [
    step.object,
    step.targetKey,
    step.parameters?.value,
    step.parameters?.url,
  ].filter(Boolean).join(' ');

  const matches = [];

  for (const rule of rules) {
    if (rule.pattern.test(searchText)) {
      matches.push(...rule.asserts);
      
      if (PLATFORM_MODE) {
        console.log(`[ASSERTION] action-rule matched: ${verb} + pattern=${rule.pattern}`);
      }
    }
  }

  return matches;
}

/**
 * Add custom action rule
 * @param {string} verb - Action verb
 * @param {Object} rule - Rule object with pattern and asserts
 */
function addRule(verb, rule) {
  if (!verb || !rule || !rule.pattern || !rule.asserts) {
    throw new Error('Invalid action rule format');
  }

  const normalizedVerb = verb.toLowerCase();
  
  if (!ACTION_RULES[normalizedVerb]) {
    ACTION_RULES[normalizedVerb] = [];
  }

  ACTION_RULES[normalizedVerb].push(rule);

  if (PLATFORM_MODE) {
    console.log(`[ASSERTION] action-rule added: ${verb}`);
  }
}

/**
 * Get all rules (for debugging)
 * @returns {Object} - All action rules
 */
function getAllRules() {
  return { ...ACTION_RULES };
}

module.exports = {
  matchRules,
  addRule,
  getAllRules,
  ACTION_RULES,
};