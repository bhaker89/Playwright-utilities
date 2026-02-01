/**
 * Variable Manager - Manages extraction and storage of variables from API responses
 */
class VariableManager {
  constructor() {
    /**
     * Stores extracted variables
     * @type {Object<string, any>}
     */
    this.variables = {};
  }

  /**
   * Extract variables from API response
   * @param {Object} response - Playwright APIResponse object
   * @param {Array} extractors - Array of variable extraction configurations
   * @returns {Promise<void>}
   */
  async extractVariables(response, extractors) {
    if (!extractors || extractors.length === 0) {
      return;
    }

    const responseBody = await this.getResponseBody(response);

    for (const extractor of extractors) {
      try {
        const value = this.extractValue(response, responseBody, extractor);
        this.setVariable(extractor.name, value);
      } catch (error) {
        console.warn(`Failed to extract variable '${extractor.name}': ${error.message}`);
      }
    }
  }

  /**
   * Extract a single value based on extractor configuration
   * @private
   * @param {Object} response - Playwright APIResponse object
   * @param {any} responseBody - Parsed response body
   * @param {Object} extractor - Extractor configuration
   * @returns {any} Extracted value
   */
  extractValue(response, responseBody, extractor) {
    switch (extractor.from) {
      case 'json_path':
        return this.extractFromJsonPath(responseBody, extractor.path);

      case 'header':
        return this.extractFromHeader(response, extractor.header_name);

      case 'status_code':
        return response.status();

      case 'body':
        return responseBody;

      default:
        throw new Error(`Unknown extraction source: ${extractor.from}`);
    }
  }

  /**
   * Extract value using JSONPath
   * @private
   */
  extractFromJsonPath(responseBody, path) {
    const { JSONPath } = require('jsonpath-plus');
    const result = JSONPath({ path, json: responseBody });

    if (result.length === 0) {
      throw new Error(`JSONPath '${path}' returned no results`);
    }

    return result[0];
  }

  /**
   * Extract value from response header
   * @private
   */
  extractFromHeader(response, headerName) {
    const headers = response.headers();
    const value = headers[headerName.toLowerCase()];

    if (value === undefined) {
      throw new Error(`Header '${headerName}' not found in response`);
    }

    return value;
  }

  /**
   * Get response body (handle different content types)
   * @private
   */
  async getResponseBody(response) {
    const contentType = response.headers()['content-type'] || '';

    try {
      if (contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      return await response.text();
    }
  }

  /**
   * Set a variable value
   * @param {string} name - Variable name
   * @param {any} value - Variable value
   */
  setVariable(name, value) {
    this.variables[name] = value;
    console.log(`Variable set: ${name} = ${JSON.stringify(value)}`);
  }

  /**
   * Get a variable value
   * @param {string} name - Variable name
   * @returns {any} Variable value
   */
  getVariable(name) {
    return this.variables[name];
  }

  /**
   * Get all variables
   * @returns {Object<string, any>} All variables
   */
  getAllVariables() {
    return { ...this.variables };
  }

  /**
   * Clear all variables
   */
  clearVariables() {
    this.variables = {};
  }

  /**
   * Check if a variable exists
   * @param {string} name - Variable name
   * @returns {boolean} True if variable exists
   */
  hasVariable(name) {
    return name in this.variables;
  }

  /**
   * Interpolate variables in a string
   * @param {string} str - String with variable placeholders like {{variableName}}
   * @returns {string} String with interpolated variables
   */
  interpolate(str) {
    if (typeof str !== 'string') {
      return str;
    }

    return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      if (this.hasVariable(varName)) {
        const value = this.getVariable(varName);
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
      return match; // Keep original if variable not found
    });
  }

  /**
   * Deep interpolate variables in an object/array
   * @param {any} obj - Object or array to interpolate
   * @returns {any} Object with interpolated variables
   */
  deepInterpolate(obj) {
    if (typeof obj === 'string') {
      return this.interpolate(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepInterpolate(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        result[key] = this.deepInterpolate(obj[key]);
      }
      return result;
    }

    return obj;
  }
}

module.exports = { VariableManager };