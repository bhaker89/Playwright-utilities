/**
 * Registry Resolution Priority Engine
 * 
 * Defines deterministic lookup order for locator registry resolution.
 * Ensures predictable target resolution across multi-team environments.
 * 
 * RESOLUTION ORDER:
 * 1. Child/Service registry (highest priority - team-specific overrides)
 * 2. Core/Global registry (shared locators across services)
 * 3. Fallback registry (deprecated/legacy locators)
 * 4. Healing memory (locator-memory.db - learned selectors)
 * 
 * ARCHITECTURE CONTRACT:
 * - Child registries can override core registries (with logging)
 * - Healing memory never overrides explicit registry entries
 * - Conflicts between same-level registries must fail fast
 * - Each resolution must be traceable for debugging
 */

const REGISTRY_TYPES = {
  CHILD: 'child',           // Service/feature-specific registry
  CORE: 'core',             // Global shared registry
  FALLBACK: 'fallback',     // Legacy/deprecated registry
  HEALING: 'healing',       // Self-healing learned registry
};

const RESOLUTION_PRIORITY = [
  REGISTRY_TYPES.CHILD,
  REGISTRY_TYPES.CORE,
  REGISTRY_TYPES.FALLBACK,
  REGISTRY_TYPES.HEALING,
];

/**
 * Get registry lookup priority order
 * @returns {string[]} - Ordered list of registry types
 */
function getRegistryPriority() {
  return [...RESOLUTION_PRIORITY];
}

/**
 * Resolve target using priority chain
 * @param {string} targetKey - Target key to resolve
 * @param {Object} registries - Object containing all loaded registries
 * @param {Object} registries.child - Child/service registry
 * @param {Object} registries.core - Core/global registry
 * @param {Object} registries.fallback - Fallback registry
 * @param {Object} registries.healing - Healing memory registry
 * @returns {Object|null} - { entry, source, priority } or null if not found
 */
function resolveRegistryPriority(targetKey, registries = {}) {
  if (!targetKey || typeof targetKey !== 'string') {
    throw new Error('RegistryResolution: targetKey must be a non-empty string');
  }

  // Iterate through priority order
  for (let i = 0; i < RESOLUTION_PRIORITY.length; i++) {
    const registryType = RESOLUTION_PRIORITY[i];
    const registry = registries[registryType];

    if (!registry || typeof registry !== 'object') {
      continue; // Skip if registry not loaded
    }

    if (registry[targetKey]) {
      return {
        entry: registry[targetKey],
        source: registryType,
        priority: i,
        totalRegistries: RESOLUTION_PRIORITY.length,
      };
    }
  }

  return null; // Not found in any registry
}

/**
 * Check if a target exists in multiple registries (potential override)
 * @param {string} targetKey - Target key to check
 * @param {Object} registries - All loaded registries
 * @returns {Array} - Array of sources where target exists
 */
function detectOverrides(targetKey, registries = {}) {
  const sources = [];

  for (const registryType of RESOLUTION_PRIORITY) {
    const registry = registries[registryType];
    if (registry && registry[targetKey]) {
      sources.push(registryType);
    }
  }

  return sources;
}

/**
 * Get human-readable description of registry type
 * @param {string} registryType - Registry type constant
 * @returns {string} - Description
 */
function getRegistryDescription(registryType) {
  const descriptions = {
    [REGISTRY_TYPES.CHILD]: 'Service-specific registry (team override)',
    [REGISTRY_TYPES.CORE]: 'Global shared registry',
    [REGISTRY_TYPES.FALLBACK]: 'Fallback/deprecated registry',
    [REGISTRY_TYPES.HEALING]: 'Self-healing learned registry',
  };

  return descriptions[registryType] || 'Unknown registry type';
}

/**
 * Validate registry priority configuration
 * Ensures all required registry types are defined
 * @returns {Object} - { valid, errors }
 */
function validateRegistryPriority() {
  const errors = [];

  // Check that priority order is defined
  if (!RESOLUTION_PRIORITY || RESOLUTION_PRIORITY.length === 0) {
    errors.push('RESOLUTION_PRIORITY is empty');
  }

  // Check that all registry types are in priority order
  for (const type of Object.values(REGISTRY_TYPES)) {
    if (!RESOLUTION_PRIORITY.includes(type)) {
      errors.push(`Registry type '${type}' not in RESOLUTION_PRIORITY`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  REGISTRY_TYPES,
  RESOLUTION_PRIORITY,
  getRegistryPriority,
  resolveRegistryPriority,
  detectOverrides,
  getRegistryDescription,
  validateRegistryPriority,
};