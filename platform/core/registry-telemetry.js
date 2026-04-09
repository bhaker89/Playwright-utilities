/**
 * Registry Resolution Telemetry
 * 
 * Centralized logging for registry resolution tracing.
 * Helps debug cross-team failures and healing issues.
 * 
 * TELEMETRY DATA:
 * - Target name
 * - Resolution source (child/core/fallback/healing)
 * - Confidence score
 * - Match type (alias/exact/fuzzy)
 * - Override detection
 * 
 * USAGE:
 * Set PLATFORM_MODE=true to enable detailed logging
 */

const { REGISTRY_TYPES, getRegistryDescription } = require('./registry-resolution-order');

// Check if telemetry is enabled
const TELEMETRY_ENABLED = process.env.PLATFORM_MODE === 'true';

/**
 * Log registry resolution event
 * @param {string} level - Log level (info, warn, debug)
 * @param {string} message - Log message
 */
function logTelemetry(level, message) {
  if (!TELEMETRY_ENABLED) {
    return;
  }

  const prefix = '[REGISTRY]';
  const timestamp = new Date().toISOString();
  
  switch (level) {
    case 'info':
      console.log(`${prefix} ${message}`);
      break;
    case 'warn':
      console.warn(`${prefix} ${message}`);
      break;
    case 'debug':
      console.debug(`${prefix} [DEBUG] ${message}`);
      break;
    case 'error':
      console.error(`${prefix} [ERROR] ${message}`);
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
}

/**
 * Log target resolution with full context
 * @param {Object} options - Telemetry options
 * @param {string} options.targetKey - Target key resolved
 * @param {string} options.source - Resolution source (child/core/fallback/healing)
 * @param {number} options.confidence - Confidence score (0-1)
 * @param {string} options.matchType - Match type (alias/exact/fuzzy)
 * @param {boolean} options.isOverride - Whether this is an override
 * @param {Array} options.overrideSources - Array of sources where target exists
 */
function logResolution(options = {}) {
  if (!TELEMETRY_ENABLED) {
    return;
  }

  const {
    targetKey,
    source,
    confidence = 'N/A',
    matchType = 'unknown',
    isOverride = false,
    overrideSources = [],
  } = options;

  if (!targetKey) {
    return;
  }

  // Main resolution log
  const confidenceStr = typeof confidence === 'number' ? confidence.toFixed(2) : confidence;
  logTelemetry('info', `resolved target=${targetKey} source=${source} confidence=${confidenceStr} matchType=${matchType}`);

  // Override detection log
  if (isOverride && overrideSources.length > 1) {
    logTelemetry('warn', `override detected: ${targetKey} exists in [${overrideSources.join(', ')}]`);
  }
}

/**
 * Log alias match detection
 * @param {string} targetKey - Target key
 * @param {string} alias - Matched alias
 * @param {string} source - Registry source
 */
function logAliasMatch(targetKey, alias, source) {
  if (!TELEMETRY_ENABLED) {
    return;
  }

  logTelemetry('info', `alias match detected: "${alias}" -> ${targetKey} (source: ${source})`);
}

/**
 * Log registry loading
 * @param {string} registryType - Type of registry loaded
 * @param {string} registryPath - Path to registry file
 * @param {number} entryCount - Number of entries loaded
 */
function logRegistryLoad(registryType, registryPath, entryCount = 0) {
  if (!TELEMETRY_ENABLED) {
    return;
  }

  const description = getRegistryDescription(registryType);
  logTelemetry('info', `loading ${registryType} registry: ${registryPath} (${entryCount} entries)`);
}

/**
 * Log namespace resolution
 * @param {string} fullTarget - Full target with namespace (e.g., "auth/login-button")
 * @param {string} namespace - Parsed namespace
 * @param {string} target - Parsed target
 */
function logNamespaceResolution(fullTarget, namespace, target) {
  if (!TELEMETRY_ENABLED) {
    return;
  }

  logTelemetry('debug', `namespace resolution: "${fullTarget}" -> namespace="${namespace}" target="${target}"`);
}

/**
 * Log environment override application
 * @param {string} targetKey - Target key
 * @param {string} environment - Environment name
 * @param {string} originalSelector - Original selector
 * @param {string} overrideSelector - Environment-specific selector
 */
function logEnvironmentOverride(targetKey, environment, originalSelector, overrideSelector) {
  if (!TELEMETRY_ENABLED) {
    return;
  }

  logTelemetry('info', `environment override: ${targetKey} env=${environment}`);
  logTelemetry('debug', `  original: ${originalSelector}`);
  logTelemetry('debug', `  override: ${overrideSelector}`);
}

/**
 * Log healing memory fallback
 * @param {string} targetKey - Target key
 * @param {string} reason - Reason for fallback
 */
function logHealingFallback(targetKey, reason) {
  if (!TELEMETRY_ENABLED) {
    return;
  }

  logTelemetry('warn', `healing fallback: ${targetKey} (reason: ${reason})`);
}

/**
 * Log registry conflict
 * @param {string} targetKey - Target key with conflict
 * @param {Array} sources - Conflicting sources
 */
function logConflict(targetKey, sources) {
  if (!TELEMETRY_ENABLED) {
    return;
  }

  logTelemetry('warn', `conflict detected: ${targetKey} in [${sources.join(', ')}]`);
}

/**
 * Log resolution summary (for batch operations)
 * @param {Object} summary - Summary statistics
 * @param {number} summary.totalResolutions - Total resolutions
 * @param {number} summary.aliasMatches - Alias matches
 * @param {number} summary.exactMatches - Exact matches
 * @param {number} summary.fuzzyMatches - Fuzzy matches
 * @param {number} summary.overrides - Override count
 * @param {number} summary.conflicts - Conflict count
 */
function logSummary(summary = {}) {
  if (!TELEMETRY_ENABLED) {
    return;
  }

  logTelemetry('info', '=== Registry Resolution Summary ===');
  logTelemetry('info', `Total resolutions: ${summary.totalResolutions || 0}`);
  logTelemetry('info', `Alias matches: ${summary.aliasMatches || 0}`);
  logTelemetry('info', `Exact matches: ${summary.exactMatches || 0}`);
  logTelemetry('info', `Fuzzy matches: ${summary.fuzzyMatches || 0}`);
  logTelemetry('info', `Overrides: ${summary.overrides || 0}`);
  logTelemetry('info', `Conflicts: ${summary.conflicts || 0}`);
}

/**
 * Check if telemetry is enabled
 * @returns {boolean}
 */
function isTelemetryEnabled() {
  return TELEMETRY_ENABLED;
}

module.exports = {
  logTelemetry,
  logResolution,
  logAliasMatch,
  logRegistryLoad,
  logNamespaceResolution,
  logEnvironmentOverride,
  logHealingFallback,
  logConflict,
  logSummary,
  isTelemetryEnabled,
};