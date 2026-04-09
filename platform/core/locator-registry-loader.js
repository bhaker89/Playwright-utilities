/**
 * Locator Registry Loader
 * 
 * Loads locator registries with priority-aware resolution.
 * Supports multi-level registry hierarchy for team collaboration.
 * 
 * REGISTRY HIERARCHY:
 * 1. Child/Service registry - Team-specific overrides
 * 2. Core/Global registry - Shared across all services
 * 3. Fallback registry - Legacy/deprecated locators
 * 4. Healing registry - Self-healing learned selectors
 * 
 * FEATURES:
 * - Priority-based resolution
 * - Environment-specific overrides (with strict mode)
 * - Conflict detection and logging
 * - Namespace support
 * 
 * ENVIRONMENT VARIABLES:
 * - TEST_ENV: Target environment (staging, prod, dev, default)
 * - ALLOW_ENV_FALLBACK: If 'true', allows fallback to default when env not found
 *                        If 'false' or unset, fails fast on missing environment
 * - PLATFORM_MODE: If 'true', enables detailed logging
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { resolveFromRoot } = require('./workspace-root');
const { REGISTRY_TYPES } = require('./registry-resolution-order');

// Platform mode for detailed logging
const PLATFORM_MODE = process.env.PLATFORM_MODE === 'true';

/**
 * Logger for registry operations (only in PLATFORM mode)
 * @param {string} message - Log message
 */
function logRegistry(message) {
  if (PLATFORM_MODE) {
    console.log(`[REGISTRY] ${message}`);
  }
}

/**
 * Load YAML file with error handling
 * @param {string} filePath - Absolute path to YAML file
 * @returns {Object|null} - Parsed YAML or null if not found
 */
function loadYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    console.error(`[REGISTRY] Failed to parse YAML: ${filePath}`);
    console.error(error.message);
    return null;
  }
}

/**
 * Load service/child registry
 * @param {string} service - Service name
 * @param {string} feature - Feature name
 * @returns {Object|null} - Loaded registry
 */
function loadServiceRegistry(service, feature) {
  if (!service || !feature) {
    return null;
  }

  const registryPath = resolveFromRoot(
    'locator-registry',
    'services',
    service,
    `${feature}.yaml`
  );

  const registry = loadYaml(registryPath);
  
  if (registry) {
    logRegistry(`Loaded child registry: services/${service}/${feature}.yaml`);
  }

  return registry;
}

/**
 * Load global/core registry
 * @param {string} feature - Feature name
 * @returns {Object|null} - Loaded registry
 */
function loadGlobalRegistry(feature) {
  if (!feature) {
    return null;
  }

  const registryPath = resolveFromRoot(
    'locator-registry',
    'global',
    `${feature}.yaml`
  );

  const registry = loadYaml(registryPath);
  
  if (registry) {
    logRegistry(`Loaded core registry: global/${feature}.yaml`);
  }

  return registry;
}

/**
 * Load fallback registry
 * @param {string} feature - Feature name
 * @returns {Object|null} - Loaded registry
 */
function loadFallbackRegistry(feature) {
  if (!feature) {
    return null;
  }

  const registryPath = resolveFromRoot(
    'locator-registry',
    'fallback',
    `${feature}.yaml`
  );

  const registry = loadYaml(registryPath);
  
  if (registry) {
    logRegistry(`Loaded fallback registry: fallback/${feature}.yaml`);
  }

  return registry;
}

/**
 * Load healing memory registry (placeholder for future integration)
 * @returns {Object|null} - Loaded healing registry
 */
function loadHealingRegistry() {
  // TODO: Integrate with locator-memory.db
  // For now, return null as healing memory is handled separately by LocatorOrchestrator
  return null;
}

/**
 * Apply environment-specific selector overrides
 * @param {Object} registry - Registry object
 * @param {string} environment - Environment name (staging, prod, etc.)
 * @returns {Object} - Registry with environment-specific selectors applied
 * @throws {Error} - If selector not defined for environment and ALLOW_ENV_FALLBACK is false
 */
function applyEnvironmentOverrides(registry, environment) {
  if (!registry || typeof registry !== 'object') {
    return registry;
  }

  const env = environment || process.env.TEST_ENV || 'default';
  const allowFallback = process.env.ALLOW_ENV_FALLBACK === 'true';
  const processedRegistry = {};

  for (const [key, entry] of Object.entries(registry)) {
    if (!entry || typeof entry !== 'object') {
      processedRegistry[key] = entry;
      continue;
    }

    // Check if primary selector has environment overrides
    if (entry.primary && typeof entry.primary === 'object') {
      const primary = entry.primary;

      // Handle environment-specific selectors
      if (primary.selector && typeof primary.selector === 'object') {
        let envSelector;

        // Strict mode logic: Check environment selector availability
        if (primary.selector[env]) {
          // Environment-specific selector exists
          envSelector = primary.selector[env];
          logRegistry(`Environment override detected: ${key} -> ${env}`);
        } else if (primary.selector.default) {
          // Fallback to default selector
          envSelector = primary.selector.default;
          
          if (env !== 'default') {
            if (allowFallback) {
              logRegistry(`Environment ${env} not defined for ${key}, using default`);
            } else {
              // Fail fast: No selector for requested environment
              throw new Error(
                `No selector defined for environment: ${env} (target: ${key}). ` +
                `Available environments: ${Object.keys(primary.selector).join(', ')}. ` +
                `Set ALLOW_ENV_FALLBACK=true to allow fallback to default.`
              );
            }
          }
        } else {
          // No default selector and no environment-specific selector
          if (allowFallback) {
            // Fallback to the selector object itself (edge case)
            envSelector = primary.selector;
            logRegistry(`Warning: No default or ${env} selector for ${key}, using selector object`);
          } else {
            throw new Error(
              `No selector defined for environment: ${env} (target: ${key}). ` +
              `No default selector found. Available environments: ${Object.keys(primary.selector).join(', ')}`
            );
          }
        }

        processedRegistry[key] = {
          ...entry,
          primary: {
            ...primary,
            value: typeof envSelector === 'string' ? envSelector : primary.value,
          },
        };
      } else {
        processedRegistry[key] = entry;
      }
    } else {
      processedRegistry[key] = entry;
    }
  }

  return processedRegistry;
}

/**
 * Load all registries with priority chain
 * @param {Object} options - Loading options
 * @param {string} options.service - Service name
 * @param {string} options.feature - Feature name
 * @param {string} options.environment - Environment name
 * @returns {Object} - Object with all loaded registries
 */
function loadAllRegistries(options = {}) {
  const { service, feature, environment } = options;

  if (!feature) {
    throw new Error('RegistryLoader: feature is required');
  }

  logRegistry(`Loading registries for feature: ${feature}`);

  const registries = {
    [REGISTRY_TYPES.CHILD]: null,
    [REGISTRY_TYPES.CORE]: null,
    [REGISTRY_TYPES.FALLBACK]: null,
    [REGISTRY_TYPES.HEALING]: null,
  };

  // Load child/service registry
  if (service) {
    const childRegistry = loadServiceRegistry(service, feature);
    if (childRegistry) {
      registries[REGISTRY_TYPES.CHILD] = applyEnvironmentOverrides(childRegistry, environment);
    }
  }

  // Load core/global registry
  const coreRegistry = loadGlobalRegistry(feature);
  if (coreRegistry) {
    registries[REGISTRY_TYPES.CORE] = applyEnvironmentOverrides(coreRegistry, environment);
  }

  // Load fallback registry
  const fallbackRegistry = loadFallbackRegistry(feature);
  if (fallbackRegistry) {
    registries[REGISTRY_TYPES.FALLBACK] = applyEnvironmentOverrides(fallbackRegistry, environment);
  }

  // Load healing registry (future)
  registries[REGISTRY_TYPES.HEALING] = loadHealingRegistry();

  return registries;
}

/**
 * Merge registries with priority (for backward compatibility)
 * Child overrides core, core overrides fallback
 * @param {Object} registries - All loaded registries
 * @returns {Object} - Merged registry
 */
function mergeRegistries(registries) {
  const merged = {};

  // Apply in reverse priority order (lowest to highest)
  const priorities = [
    REGISTRY_TYPES.HEALING,
    REGISTRY_TYPES.FALLBACK,
    REGISTRY_TYPES.CORE,
    REGISTRY_TYPES.CHILD,
  ];

  for (const registryType of priorities) {
    const registry = registries[registryType];
    if (registry && typeof registry === 'object') {
      Object.assign(merged, registry);
    }
  }

  return merged;
}

/**
 * Load locator registry (legacy function for backward compatibility)
 * @param {string} service - Service name
 * @param {string} feature - Feature name
 * @returns {Object|null} - Merged registry
 */
function loadLocatorRegistry(service, feature) {
  const registries = loadAllRegistries({ service, feature });
  return mergeRegistries(registries);
}

module.exports = {
  loadServiceRegistry,
  loadGlobalRegistry,
  loadFallbackRegistry,
  loadHealingRegistry,
  loadAllRegistries,
  mergeRegistries,
  loadLocatorRegistry, // Backward compatibility
  applyEnvironmentOverrides,
  logRegistry,
};