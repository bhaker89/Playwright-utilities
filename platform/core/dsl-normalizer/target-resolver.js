/**
 * Target Resolver
 * 
 * Maps human-readable object names to registry keys.
 * This is the critical link between natural language and the locator registry.
 * 
 * Example:
 *   Input: "email" → Output: "email_input"
 *   Input: "login button" → Output: "submit_login_button"
 * 
 * ARCHITECTURE CONTRACT:
 * - Registry is the single source of truth
 * - NO selector guessing (fail if not in registry)
 * - Supports alias matching (before fuzzy matching)
 * - Supports namespace resolution (auth/login-button)
 * - Supports fuzzy matching with confidence scoring
 * - Returns registry key or throws error
 */

const path = require('path');
const { loadLocatorRegistry, loadAllRegistries } = require('../locator-registry-loader');
const { resolveRegistryPriority, detectOverrides } = require('../registry-resolution-order');

/**
 * Calculate string similarity score (Levenshtein distance normalized)
 * @param {string} str1
 * @param {string} str2
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1.0;

  // Exact substring match gets high score
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Levenshtein distance
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

/**
 * Normalize object name for comparison
 * @param {string} name
 * @returns {string}
 */
function normalizeObjectName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Check if object name matches any alias in registry entry
 * @param {string} objectName - Human-readable object name
 * @param {Object} entry - Registry entry
 * @returns {boolean} - True if alias matches
 */
function matchesAlias(objectName, entry) {
  if (!entry || !entry.aliases || !Array.isArray(entry.aliases)) {
    return false;
  }

  const normalized = normalizeObjectName(objectName);

  for (const alias of entry.aliases) {
    const normalizedAlias = normalizeObjectName(alias);
    if (normalized === normalizedAlias) {
      return true;
    }
  }

  return false;
}

/**
 * Find registry key by alias match (highest priority)
 * @param {string} objectName - Human-readable object name
 * @param {Object} registry - Loaded locator registry
 * @returns {string|null} - Registry key or null if no alias match
 */
function findByAlias(objectName, registry) {
  if (!registry || typeof registry !== 'object') {
    return null;
  }

  const normalized = normalizeObjectName(objectName);

  for (const [key, entry] of Object.entries(registry)) {
    // Check for exact alias match
    if (matchesAlias(objectName, entry)) {
      return key;
    }
  }

  return null;
}

/**
 * Parse namespace from target (e.g., "auth/login-button" -> { namespace: "auth", target: "login-button" })
 * @param {string} objectName - Object name (may include namespace)
 * @returns {Object} - { namespace, target }
 */
function parseNamespace(objectName) {
  if (!objectName || typeof objectName !== 'string') {
    return { namespace: null, target: objectName };
  }

  const parts = objectName.split('/');
  
  if (parts.length === 2) {
    return {
      namespace: parts[0].trim(),
      target: parts[1].trim(),
    };
  }

  return { namespace: null, target: objectName };
}

/**
 * Match object name against registry keys with fuzzy matching
 * Supports alias matching (before fuzzy) and namespace resolution
 * @param {string} objectName - Human-readable object name
 * @param {Object} registry - Loaded locator registry
 * @param {Object} options - Options
 * @returns {Object} - { key, confidence, alternatives, matchType, source }
 */
function matchAgainstRegistry(objectName, registry, options = {}) {
  const {
    minConfidence = 0.7,
    maxAlternatives = 3,
    enableAliases = true,
    enableNamespaces = true,
  } = options;

  if (!objectName || typeof objectName !== 'string') {
    throw new Error('TargetResolver: objectName must be a non-empty string');
  }

  if (!registry || typeof registry !== 'object') {
    throw new Error('TargetResolver: registry must be an object');
  }

  const registryKeys = Object.keys(registry);
  
  if (registryKeys.length === 0) {
    throw new Error('TargetResolver: registry is empty');
  }

  // Parse namespace if enabled
  let targetName = objectName;
  let namespace = null;
  
  if (enableNamespaces) {
    const parsed = parseNamespace(objectName);
    namespace = parsed.namespace;
    targetName = parsed.target;
  }

  // STEP 1: Try exact alias match (highest priority)
  if (enableAliases) {
    const aliasMatch = findByAlias(targetName, registry);
    if (aliasMatch) {
      return {
        key: aliasMatch,
        confidence: 0.99, // Alias match gets very high confidence
        matchType: 'alias',
        alternatives: [],
      };
    }
  }

  const normalized = normalizeObjectName(targetName);

  // STEP 2: Try exact key match
  for (const key of registryKeys) {
    if (normalizeObjectName(key) === normalized) {
      return {
        key,
        confidence: 1.0,
        matchType: 'exact',
        alternatives: [],
      };
    }
  }

  // STEP 3: Fuzzy matching
  const matches = registryKeys.map(key => {
    const normalizedKey = normalizeObjectName(key);
    const similarity = calculateSimilarity(normalized, normalizedKey);

    return {
      key,
      confidence: similarity,
    };
  });

  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);

  const best = matches[0];

  // Check if best match meets threshold
  if (best.confidence < minConfidence) {
    const alternatives = matches.slice(0, maxAlternatives).map(m => m.key);
    throw new Error(
      `TargetResolver: No confident match for "${objectName}". ` +
      `Best match: "${best.key}" (confidence: ${best.confidence.toFixed(2)}). ` +
      `Did you mean one of: ${alternatives.join(', ')}? ` +
      `Available keys in registry: ${registryKeys.join(', ')}`
    );
  }

  return {
    key: best.key,
    confidence: best.confidence,
    matchType: 'fuzzy',
    alternatives: matches.slice(1, maxAlternatives + 1),
  };
}

/**
 * Resolve target from tokenized step
 * @param {Object} tokens - Tokenized step
 * @param {Object} registry - Locator registry
 * @param {Object} options - Options
 * @returns {string} - Registry key
 */
function resolveTarget(tokens, registry, options = {}) {
  if (!tokens || typeof tokens !== 'object') {
    throw new Error('TargetResolver: tokens must be an object');
  }

  // Special cases that don't need registry lookup
  if (tokens.verb === 'navigate' || tokens.verb === 'goto') {
    // Navigation uses URLs, not registry targets
    return null;
  }

  if (tokens.verb === 'include') {
    // Flow includes use flow names, not registry targets
    return null;
  }

  if (tokens.verb === 'wait' && !tokens.object) {
    // Generic wait (no target)
    return null;
  }

  // All other actions require a target
  if (!tokens.object) {
    throw new Error(
      `TargetResolver: Action "${tokens.verb}" requires a target object. ` +
      `Example: "${tokens.verb} <target>"`
    );
  }

  // Match against registry
  const match = matchAgainstRegistry(tokens.object, registry, options);

  return match.key;
}

/**
 * Resolve targets for multiple tokenized steps
 * @param {Object[]} tokensArray - Array of tokenized steps
 * @param {Object} registry - Locator registry
 * @param {Object} options - Options
 * @returns {Object[]} - Array with resolved target keys
 */
function resolveTargets(tokensArray, registry, options = {}) {
  if (!Array.isArray(tokensArray)) {
    throw new Error('TargetResolver: tokensArray must be an array');
  }

  return tokensArray.map((tokens, index) => {
    try {
      const targetKey = resolveTarget(tokens, registry, options);
      return {
        ...tokens,
        targetKey,
      };
    } catch (err) {
      throw new Error(`TargetResolver: failed at step ${index + 1}: ${err.message}`);
    }
  });
}

/**
 * Load registry and resolve target in one call
 * @param {Object} tokens - Tokenized step
 * @param {string} service - Service name
 * @param {string} feature - Feature name
 * @param {Object} options - Options
 * @returns {Promise<string>} - Registry key
 */
async function resolveTargetWithRegistry(tokens, service, feature, options = {}) {
  const registry = await loadLocatorRegistry(service, feature);
  return resolveTarget(tokens, registry, options);
}

module.exports = {
  resolveTarget,
  resolveTargets,
  matchAgainstRegistry,
  resolveTargetWithRegistry,
  calculateSimilarity,
  normalizeObjectName,
  findByAlias,
  matchesAlias,
  parseNamespace,
};