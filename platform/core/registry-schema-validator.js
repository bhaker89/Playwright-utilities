/**
 * Registry Schema Validator
 * 
 * Validates locator registry YAML structure and content.
 * Prevents malformed registries from causing runtime failures.
 * 
 * VALIDATION RULES:
 * - Each entry must have primary selector
 * - Selector must have type and value
 * - Aliases must be array of strings
 * - Environment overrides must be valid
 * - Namespace format must be valid
 * - Required fields must be present
 */

const path = require('path');

/**
 * Validate selector object structure
 * @param {Object} selector - Selector object to validate
 * @param {string} context - Context for error messages
 * @returns {Array} - Array of error messages
 */
function validateSelector(selector, context) {
  const errors = [];

  if (!selector || typeof selector !== 'object') {
    errors.push(`${context}: selector must be an object`);
    return errors;
  }

  if (!selector.type) {
    errors.push(`${context}: selector.type is required`);
  }

  const validTypes = ['css', 'xpath', 'testid', 'text', 'label', 'role'];
  if (selector.type && !validTypes.includes(selector.type)) {
    errors.push(`${context}: selector.type must be one of: ${validTypes.join(', ')}`);
  }

  if (!selector.value && selector.type !== 'role') {
    errors.push(`${context}: selector.value is required`);
  }

  return errors;
}

/**
 * Validate aliases array
 * @param {Array} aliases - Aliases to validate
 * @param {string} context - Context for error messages
 * @returns {Array} - Array of error messages
 */
function validateAliases(aliases, context) {
  const errors = [];

  if (!Array.isArray(aliases)) {
    errors.push(`${context}: aliases must be an array`);
    return errors;
  }

  for (let i = 0; i < aliases.length; i++) {
    if (typeof aliases[i] !== 'string') {
      errors.push(`${context}: aliases[${i}] must be a string`);
    }
  }

  return errors;
}

/**
 * Validate environment overrides
 * @param {Object} selector - Selector with potential environment overrides
 * @param {string} context - Context for error messages
 * @returns {Array} - Array of error messages
 */
function validateEnvironmentOverrides(selector, context) {
  const errors = [];

  if (selector.selector && typeof selector.selector === 'object') {
    if (!selector.selector.default) {
      errors.push(`${context}: environment overrides must include 'default'`);
    }

    const validEnvs = ['default', 'staging', 'prod', 'dev'];
    for (const env of Object.keys(selector.selector)) {
      if (!validEnvs.includes(env)) {
        errors.push(`${context}: invalid environment '${env}' (valid: ${validEnvs.join(', ')})`);
      }
    }
  }

  return errors;
}

/**
 * Validate assertions object
 * @param {Object} asserts - Assertions object to validate
 * @param {string} context - Context for error messages
 * @returns {Array} - Array of error messages
 */
function validateAssertions(asserts, context) {
  const errors = [];

  if (!asserts || typeof asserts !== 'object') {
    errors.push(`${context}: asserts must be an object`);
    return errors;
  }

  const validEnvironments = ['default', 'staging', 'prod', 'dev', 'success'];

  // Validate each environment/type key
  for (const [key, value] of Object.entries(asserts)) {
    if (!validEnvironments.includes(key)) {
      errors.push(`${context}.${key}: invalid assertion key '${key}' (valid: ${validEnvironments.join(', ')})`);
      continue;
    }

    // Value can be array or single item
    const assertions = Array.isArray(value) ? value : [value];

    for (let i = 0; i < assertions.length; i++) {
      const assertion = assertions[i];
      const assertContext = `${context}.${key}[${i}]`;

      if (typeof assertion === 'string') {
        // Simple string assertion is valid
        continue;
      }

      if (typeof assertion !== 'string' && typeof assertion !== 'object') {
        errors.push(`${assertContext}: assertion must be a string or object`);
      }
    }
  }

  return errors;
}

/**
 * Validate namespace format
 * @param {string} targetKey - Target key to validate
 * @returns {Array} - Array of error messages
 */
function validateNamespace(targetKey) {
  const errors = [];

  if (targetKey.includes('/')) {
    const parts = targetKey.split('/');
    
    if (parts.length > 2) {
      errors.push(`Invalid namespace format: '${targetKey}' (only one level allowed: namespace/target)`);
    }

    if (parts[0].trim() === '' || parts[1].trim() === '') {
      errors.push(`Invalid namespace format: '${targetKey}' (namespace and target cannot be empty)`);
    }
  }

  return errors;
}

/**
 * Validate single registry entry
 * @param {string} targetKey - Target key
 * @param {Object} entry - Registry entry
 * @returns {Array} - Array of error messages
 */
function validateRegistryEntry(targetKey, entry) {
  const errors = [];
  const context = `Target '${targetKey}'`;

  if (!entry || typeof entry !== 'object') {
    errors.push(`${context}: entry must be an object`);
    return errors;
  }

  // Validate primary selector (required)
  if (!entry.primary) {
    errors.push(`${context}: primary selector is required`);
  } else {
    errors.push(...validateSelector(entry.primary, `${context}.primary`));
  }

  // Validate fallback selectors (optional)
  if (entry.fallback) {
    if (!Array.isArray(entry.fallback)) {
      errors.push(`${context}: fallback must be an array`);
    } else {
      for (let i = 0; i < entry.fallback.length; i++) {
        errors.push(...validateSelector(entry.fallback[i], `${context}.fallback[${i}]`));
      }
    }
  }

  // Validate aliases (optional)
  if (entry.aliases) {
    errors.push(...validateAliases(entry.aliases, `${context}.aliases`));
  }

  // Validate environment overrides (optional)
  if (entry.primary) {
    errors.push(...validateEnvironmentOverrides(entry.primary, `${context}.primary`));
  }

  // Validate namespace format
  errors.push(...validateNamespace(targetKey));

  // Validate assertions (optional)
  if (entry.asserts) {
    errors.push(...validateAssertions(entry.asserts, `${context}.asserts`));
  }


  if (entry.score !== undefined && (typeof entry.score !== 'number' || entry.score < 0 || entry.score > 1)) {
    errors.push(`${context}: score must be a number between 0 and 1`);
  }

  return errors;
}

/**
 * Validate entire registry
 * @param {Object} registry - Registry object to validate
 * @param {string} registryName - Registry name for error messages
 * @returns {Object} - { valid, errors, warnings }
 */
function validateRegistry(registry, registryName = 'registry') {
  const errors = [];
  const warnings = [];

  if (!registry || typeof registry !== 'object') {
    return {
      valid: false,
      errors: [`${registryName}: registry must be an object`],
      warnings: [],
    };
  }

  const entries = Object.entries(registry);

  if (entries.length === 0) {
    warnings.push(`${registryName}: registry is empty`);
  }

  for (const [targetKey, entry] of entries) {
    const entryErrors = validateRegistryEntry(targetKey, entry);
    errors.push(...entryErrors);


    if (!entry.lastValidated) {
      warnings.push(`${registryName}.${targetKey}: missing recommended field 'lastValidated'`);
    }

    if (!entry.source) {
      warnings.push(`${registryName}.${targetKey}: missing recommended field 'source'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate registry structure against schema
 * @param {Object} registry - Registry to validate
 * @param {Object} options - Validation options
 * @returns {Object} - { valid, errors, warnings }
 */
function validateRegistrySchema(registry, options = {}) {
  const {
    registryName = 'registry',
    strict = false, // If true, warnings become errors
  } = options;

  const result = validateRegistry(registry, registryName);

  if (strict && result.warnings.length > 0) {
    result.errors.push(...result.warnings);
    result.warnings = [];
    result.valid = false;
  }

  return result;
}

module.exports = {
  validateRegistry,
  validateRegistryEntry,
  validateRegistrySchema,
  validateSelector,
  validateAliases,
  validateEnvironmentOverrides,
  validateNamespace,
  validateAssertions,
};