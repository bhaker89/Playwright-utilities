/**
 * Registry Conflict Detector
 * 
 * Detects and reports conflicts in locator registry resolution.
 * Ensures safe multi-team collaboration with clear override rules.
 * 
 * CONFLICT RULES:
 * - Child registry can override core registry (log warning)
 * - Core registry can override fallback registry (log info)
 * - Two child registries with same target = FAIL (ambiguous)
 * - Alias collisions = WARNING
 * - Selector mismatches = WARNING
 * 
 * PHILOSOPHY:
 * - Fail fast on ambiguous conflicts
 * - Log all overrides for transparency
 * - Help debug healing issues
 */

const { REGISTRY_TYPES, getRegistryDescription } = require('./registry-resolution-order');

// Platform mode for detailed logging
const PLATFORM_MODE = process.env.PLATFORM_MODE === 'true';

/**
 * Logger for conflict detection
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 */
function logConflict(level, message) {
  if (PLATFORM_MODE) {
    const prefix = level === 'error' ? '[REGISTRY ERROR]' : '[REGISTRY]';
    console[level](`${prefix} ${message}`);
  }
}

/**
 * Detect duplicate targets across registries
 * @param {string} targetKey - Target key to check
 * @param {Object} registries - All loaded registries
 * @returns {Array} - Array of { source, entry } where target exists
 */
function detectDuplicateTargets(targetKey, registries = {}) {
  const duplicates = [];

  for (const [registryType, registry] of Object.entries(registries)) {
    if (!registry || typeof registry !== 'object') {
      continue;
    }

    if (registry[targetKey]) {
      duplicates.push({
        source: registryType,
        entry: registry[targetKey],
      });
    }
  }

  return duplicates;
}

/**
 * Detect selector mismatches for duplicate targets
 * @param {Array} duplicates - Array from detectDuplicateTargets
 * @returns {boolean} - True if selectors differ
 */
function hasSelectorMismatch(duplicates) {
  if (duplicates.length <= 1) {
    return false;
  }

  const selectors = duplicates.map(dup => {
    const primary = dup.entry?.primary;
    if (!primary) return null;
    return JSON.stringify({ type: primary.type, value: primary.value });
  });

  const uniqueSelectors = new Set(selectors.filter(Boolean));
  return uniqueSelectors.size > 1;
}

/**
 * Collect all aliases from a registry
 * @param {Object} registry - Registry object
 * @returns {Object} - Map of alias -> targetKey
 */
function collectAliases(registry) {
  const aliasMap = {};

  if (!registry || typeof registry !== 'object') {
    return aliasMap;
  }

  for (const [targetKey, entry] of Object.entries(registry)) {
    if (!entry || !entry.aliases || !Array.isArray(entry.aliases)) {
      continue;
    }

    for (const alias of entry.aliases) {
      const normalizedAlias = String(alias || '').toLowerCase().trim();
      
      if (!aliasMap[normalizedAlias]) {
        aliasMap[normalizedAlias] = [];
      }
      
      aliasMap[normalizedAlias].push(targetKey);
    }
  }

  return aliasMap;
}

/**
 * Detect alias collisions within a single registry
 * @param {Object} registry - Registry object
 * @param {string} registryType - Registry type for logging
 * @returns {Array} - Array of collision objects
 */
function detectAliasCollisions(registry, registryType) {
  const collisions = [];
  const aliasMap = collectAliases(registry);

  for (const [alias, targetKeys] of Object.entries(aliasMap)) {
    if (targetKeys.length > 1) {
      collisions.push({
        alias,
        targetKeys,
        registryType,
      });
    }
  }

  return collisions;
}

/**
 * Detect conflicts between two child registries (same level)
 * This should never happen in normal operation
 * @param {Object} registries - All loaded registries
 * @returns {Array} - Array of conflict objects
 */
function detectSameLevelConflicts(registries = {}) {
  const conflicts = [];
  
  // Check for multiple child registries (future-proofing for multi-service scenarios)
  // In current implementation, only one child registry is loaded at a time
  // This is a placeholder for future multi-child registry support

  return conflicts;
}

/**
 * Validate override rules
 * @param {string} targetKey - Target key being overridden
 * @param {Array} duplicates - Array of { source, entry }
 * @returns {Object} - { valid, warning, error }
 */
function validateOverrideRules(targetKey, duplicates) {
  if (duplicates.length <= 1) {
    return { valid: true, warning: null, error: null };
  }

  const sources = duplicates.map(d => d.source);

  // Rule: Child can override core (log warning)
  if (sources.includes(REGISTRY_TYPES.CHILD) && sources.includes(REGISTRY_TYPES.CORE)) {
    const childEntry = duplicates.find(d => d.source === REGISTRY_TYPES.CHILD).entry;
    const coreEntry = duplicates.find(d => d.source === REGISTRY_TYPES.CORE).entry;

    const mismatch = hasSelectorMismatch([
      { source: REGISTRY_TYPES.CHILD, entry: childEntry },
      { source: REGISTRY_TYPES.CORE, entry: coreEntry },
    ]);

    if (mismatch) {
      return {
        valid: true,
        warning: `Override detected: ${targetKey} (child overrides core with different selector)`,
        error: null,
      };
    }

    return {
      valid: true,
      warning: `Override detected: ${targetKey} (child overrides core)`,
      error: null,
    };
  }

  // Rule: Core can override fallback (log info)
  if (sources.includes(REGISTRY_TYPES.CORE) && sources.includes(REGISTRY_TYPES.FALLBACK)) {
    return {
      valid: true,
      warning: null,
      error: null,
    };
  }

  // Rule: Healing memory should never override explicit entries
  if (sources.includes(REGISTRY_TYPES.HEALING) && sources.length > 1) {
    return {
      valid: false,
      warning: null,
      error: `Healing memory attempting to override explicit registry entry: ${targetKey}`,
    };
  }

  return { valid: true, warning: null, error: null };
}

/**
 * Run comprehensive conflict detection
 * @param {Object} registries - All loaded registries
 * @param {Object} options - Detection options
 * @returns {Object} - { conflicts, warnings, errors }
 */
function detectAllConflicts(registries = {}, options = {}) {
  const { failOnConflict = true } = options;
  
  const result = {
    conflicts: [],
    warnings: [],
    errors: [],
  };

  // Collect all unique target keys
  const allTargets = new Set();
  for (const [registryType, registry] of Object.entries(registries)) {
    if (registry && typeof registry === 'object') {
      Object.keys(registry).forEach(key => allTargets.add(key));
    }
  }

  // Check each target for duplicates
  for (const targetKey of allTargets) {
    const duplicates = detectDuplicateTargets(targetKey, registries);
    
    if (duplicates.length > 1) {
      const validation = validateOverrideRules(targetKey, duplicates);
      
      if (!validation.valid) {
        result.errors.push(validation.error);
        logConflict('error', validation.error);
      } else if (validation.warning) {
        result.warnings.push(validation.warning);
        logConflict('warn', validation.warning);
      }

      result.conflicts.push({
        targetKey,
        duplicates,
        validation,
      });
    }
  }

  // Check for alias collisions within each registry
  for (const [registryType, registry] of Object.entries(registries)) {
    if (!registry || typeof registry !== 'object') {
      continue;
    }

    const collisions = detectAliasCollisions(registry, registryType);
    
    for (const collision of collisions) {
      const warning = `Alias collision in ${registryType}: "${collision.alias}" -> [${collision.targetKeys.join(', ')}]`;
      result.warnings.push(warning);
      logConflict('warn', warning);
    }
  }

  // Check for same-level conflicts
  const sameLevelConflicts = detectSameLevelConflicts(registries);
  for (const conflict of sameLevelConflicts) {
    result.errors.push(conflict.error);
    logConflict('error', conflict.error);
  }

  // Fail if errors found and failOnConflict is true
  if (failOnConflict && result.errors.length > 0) {
    throw new Error(
      `Registry conflicts detected:\n${result.errors.join('\n')}`
    );
  }

  return result;
}

/**
 * Log override information for a resolved target
 * @param {string} targetKey - Target key
 * @param {Object} resolution - Resolution result from resolveRegistryPriority
 * @param {Object} registries - All loaded registries
 */
function logOverrideInfo(targetKey, resolution, registries) {
  if (!resolution) {
    return;
  }

  const duplicates = detectDuplicateTargets(targetKey, registries);
  
  if (duplicates.length > 1) {
    const sources = duplicates.map(d => d.source).join(', ');
    logConflict('info', `Resolved ${targetKey} from ${resolution.source} (also in: ${sources})`);
  }
}

module.exports = {
  detectDuplicateTargets,
  hasSelectorMismatch,
  detectAliasCollisions,
  detectSameLevelConflicts,
  validateOverrideRules,
  detectAllConflicts,
  logOverrideInfo,
  collectAliases,
};