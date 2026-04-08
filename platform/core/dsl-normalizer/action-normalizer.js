/**
 * Action Normalizer
 * 
 * Maps natural language verbs to canonical action names.
 * This creates deterministic execution while preserving human readability.
 * 
 * Example:
 *   Input: "enter" → Output: "fill"
 *   Input: "tap" → Output: "click"
 *   Input: "visit" → Output: "navigate"
 * 
 * ARCHITECTURE CONTRACT:
 * - Uses action-dictionary.js as source of truth
 * - Returns canonical action or throws error
 * - No registry lookup (that's target-resolver's job)
 */

const { getCanonicalAction, isValidAction, getCanonicalActions } = require('../action-dictionary');

/**
 * Normalize a verb to its canonical action
 * @param {string} verb - User-provided verb from tokenizer
 * @param {Object} options - Options
 * @param {boolean} options.strict - Throw error if verb not found (default: true)
 * @returns {string|null} - Canonical action name
 */
function normalize(verb, options = {}) {
  const { strict = true } = options;

  if (!verb || typeof verb !== 'string') {
    if (strict) {
      throw new Error('ActionNormalizer: verb must be a non-empty string');
    }
    return null;
  }

  const canonical = getCanonicalAction(verb);

  if (!canonical) {
    if (strict) {
      const supported = getCanonicalActions();
      throw new Error(
        `ActionNormalizer: Unknown verb "${verb}". ` +
        `Supported actions: ${supported.join(', ')}`
      );
    }
    return null;
  }

  return canonical;
}

/**
 * Normalize multiple verbs
 * @param {string[]} verbs - Array of verbs
 * @param {Object} options - Options
 * @returns {string[]} - Array of canonical actions
 */
function normalizeMany(verbs, options = {}) {
  if (!Array.isArray(verbs)) {
    throw new Error('ActionNormalizer: verbs must be an array');
  }

  return verbs.map((verb, index) => {
    try {
      return normalize(verb, options);
    } catch (err) {
      throw new Error(`ActionNormalizer: failed at verb ${index + 1}: ${err.message}`);
    }
  });
}

/**
 * Check if a verb can be normalized
 * @param {string} verb
 * @returns {boolean}
 */
function canNormalize(verb) {
  return isValidAction(verb);
}

/**
 * Normalize a tokenized step (mutates verb field)
 * @param {Object} tokens - Tokenized step from tokenizer
 * @param {Object} options - Options
 * @returns {Object} - Tokens with normalized verb
 */
function normalizeTokens(tokens, options = {}) {
  if (!tokens || typeof tokens !== 'object') {
    throw new Error('ActionNormalizer: tokens must be an object');
  }

  if (!tokens.verb) {
    throw new Error('ActionNormalizer: tokens must have a verb field');
  }

  const canonicalVerb = normalize(tokens.verb, options);

  return {
    ...tokens,
    verb: canonicalVerb,
    originalVerb: tokens.originalVerb || tokens.verb, // Preserve original
  };
}

/**
 * Normalize many tokenized steps
 * @param {Object[]} tokensArray - Array of tokenized steps
 * @param {Object} options - Options
 * @returns {Object[]} - Array with normalized verbs
 */
function normalizeManyTokens(tokensArray, options = {}) {
  if (!Array.isArray(tokensArray)) {
    throw new Error('ActionNormalizer: tokensArray must be an array');
  }

  return tokensArray.map((tokens, index) => {
    try {
      return normalizeTokens(tokens, options);
    } catch (err) {
      throw new Error(`ActionNormalizer: failed at step ${index + 1}: ${err.message}`);
    }
  });
}

module.exports = {
  normalize,
  normalizeMany,
  canNormalize,
  normalizeTokens,
  normalizeManyTokens,
};