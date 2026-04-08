/**
 * Parameter Extractor
 * 
 * Extracts parameters and values from tokenized steps.
 * Identifies URLs, test data, identifiers, and action-specific parameters.
 * 
 * Example:
 *   Input: { verb: "fill", object: "email", value: "test@example.com" }
 *   Output: { value: "test@example.com" }
 * 
 *   Input: { verb: "navigate", value: "https://example.com/login" }
 *   Output: { url: "https://example.com/login" }
 * 
 * ARCHITECTURE CONTRACT:
 * - Extracts parameters based on action type
 * - Preserves test data variables (e.g., ${USER_EMAIL})
 * - Validates parameter types
 */

/**
 * Check if a string is a URL
 * @param {string} str
 * @returns {boolean}
 */
function isUrl(str) {
  if (!str || typeof str !== 'string') return false;
  
  // Basic URL detection
  return /^(https?:\/\/|\/)/i.test(str.trim());
}

/**
 * Check if a string is a test data variable
 * @param {string} str
 * @returns {boolean}
 */
function isVariable(str) {
  if (!str || typeof str !== 'string') return false;
  
  // Matches ${VAR_NAME} or $VAR_NAME
  return /\$\{[A-Z_]+\}|\$[A-Z_]+/i.test(str);
}

/**
 * Extract parameters from tokenized step
 * @param {Object} tokens - Tokenized step
 * @returns {Object} - Extracted parameters
 */
function extractParameters(tokens) {
  if (!tokens || typeof tokens !== 'object') {
    throw new Error('ParameterExtractor: tokens must be an object');
  }

  const { verb, value, object } = tokens;
  const params = {};

  // Navigation actions
  if (verb === 'navigate' || verb === 'goto') {
    if (!value) {
      throw new Error('ParameterExtractor: navigate action requires a URL value');
    }
    params.url = value.trim();
    return params;
  }

  // Fill/type actions
  if (verb === 'fill' || verb === 'type') {
    if (!value) {
      throw new Error(`ParameterExtractor: ${verb} action requires a value`);
    }
    params.value = value.trim();
    return params;
  }

  // Select actions
  if (verb === 'select') {
    if (!value) {
      throw new Error('ParameterExtractor: select action requires a value');
    }
    params.value = value.trim();
    return params;
  }

  // Press key actions
  if (verb === 'press') {
    if (!value) {
      throw new Error('ParameterExtractor: press action requires a key value');
    }
    params.key = value.trim();
    return params;
  }

  // Wait actions
  if (verb === 'wait') {
    // Check if value is a duration (number + unit)
    if (value && /^\d+\s*(ms|s|sec|seconds?|milliseconds?)$/i.test(value)) {
      params.timeout = parseTimeout(value);
    }
    return params;
  }

  // Include actions
  if (verb === 'include') {
    if (!object) {
      throw new Error('ParameterExtractor: include action requires a flow name');
    }
    params.flow = object.trim();
    return params;
  }

  // Click, check, uncheck don't need additional parameters
  return params;
}

/**
 * Parse timeout string to milliseconds
 * @param {string} timeoutStr - e.g., "5s", "500ms", "2 seconds"
 * @returns {number} - Timeout in milliseconds
 */
function parseTimeout(timeoutStr) {
  const match = timeoutStr.match(/^(\d+)\s*(ms|s|sec|seconds?|milliseconds?)?$/i);
  
  if (!match) {
    throw new Error(`ParameterExtractor: Invalid timeout format "${timeoutStr}"`);
  }

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();

  if (unit.startsWith('ms') || unit.startsWith('millisecond')) {
    return value;
  }
  
  // Default to seconds
  return value * 1000;
}

/**
 * Extract parameters from multiple tokenized steps
 * @param {Object[]} tokensArray - Array of tokenized steps
 * @returns {Object[]} - Array with extracted parameters
 */
function extractManyParameters(tokensArray) {
  if (!Array.isArray(tokensArray)) {
    throw new Error('ParameterExtractor: tokensArray must be an array');
  }

  return tokensArray.map((tokens, index) => {
    try {
      const params = extractParameters(tokens);
      return {
        ...tokens,
        params,
      };
    } catch (err) {
      throw new Error(`ParameterExtractor: failed at step ${index + 1}: ${err.message}`);
    }
  });
}

/**
 * Validate extracted parameters for an action
 * @param {string} action - Canonical action name
 * @param {Object} params - Extracted parameters
 * @returns {boolean}
 */
function validateParameters(action, params) {
  if (!action || typeof action !== 'string') {
    return false;
  }

  if (!params || typeof params !== 'object') {
    return false;
  }

  // Action-specific validation
  switch (action) {
    case 'navigate':
    case 'goto':
      return typeof params.url === 'string' && params.url.length > 0;
    
    case 'fill':
    case 'type':
      return typeof params.value === 'string';
    
    case 'select':
      return typeof params.value === 'string' && params.value.length > 0;
    
    case 'press':
      return typeof params.key === 'string' && params.key.length > 0;
    
    case 'wait':
      return params.timeout === undefined || typeof params.timeout === 'number';
    
    case 'include':
      return typeof params.flow === 'string' && params.flow.length > 0;
    
    case 'click':
    case 'check':
    case 'uncheck':
      // These don't require additional parameters
      return true;
    
    default:
      return false;
  }
}

/**
 * Build final step object with parameters
 * @param {Object} tokens - Tokenized step with target resolved
 * @param {Object} params - Extracted parameters
 * @returns {Object} - Final canonical step object
 */
function buildStepObject(tokens, params) {
  const step = {
    action: tokens.verb,
  };

  // Add target if present
  if (tokens.targetKey) {
    step.target = tokens.targetKey;
  }

  // Add parameters
  Object.assign(step, params);

  // Preserve original for debugging
  if (tokens.raw) {
    step._original = tokens.raw;
  }

  return step;
}

module.exports = {
  extractParameters,
  extractManyParameters,
  validateParameters,
  buildStepObject,
  parseTimeout,
  isUrl,
  isVariable,
};