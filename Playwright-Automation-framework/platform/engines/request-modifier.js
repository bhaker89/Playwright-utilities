const { VariableManager } = require('./variable-manager');

/**
 * Request Modifier - Modifies API requests with dynamic data and variables
 */
class RequestModifier {
  /**
   * @param {VariableManager} variableManager - Variable manager instance
   */
  constructor(variableManager) {
    this.variableManager = variableManager;
  }

  /**
   * Modify a request with dynamic data
   * @param {Object} request - Original request configuration
   * @param {Object} modifiers - Modification configurations
   * @param {Object} dataRow - Data row from CSV/JSON for parameterization
   * @returns {Object} Modified request configuration
   */
  modifyRequest(request, modifiers = {}, dataRow = null) {
    let modifiedRequest = JSON.parse(JSON.stringify(request)); // Deep clone

    // Apply data-driven modifications first
    if (dataRow) {
      modifiedRequest = this.applyDataRow(modifiedRequest, dataRow);
    }

    // Apply variable interpolation
    modifiedRequest = this.variableManager.deepInterpolate(modifiedRequest);

    // Apply specific modifiers
    if (modifiers.headers) {
      modifiedRequest.headers = {
        ...modifiedRequest.headers,
        ...this.variableManager.deepInterpolate(modifiers.headers),
      };
    }

    if (modifiers.query_params) {
      modifiedRequest.params = {
        ...modifiedRequest.params,
        ...this.variableManager.deepInterpolate(modifiers.query_params),
      };
    }

    if (modifiers.body) {
      modifiedRequest.data = this.variableManager.deepInterpolate(modifiers.body);
    }

    if (modifiers.url) {
      modifiedRequest.url = this.variableManager.interpolate(modifiers.url);
    }

    return modifiedRequest;
  }

  /**
   * Apply data row to request (for data-driven testing)
   * @private
   * @param {Object} request - Request configuration
   * @param {Object} dataRow - Data row from CSV/JSON
   * @returns {Object} Request with data applied
   */
  applyDataRow(request, dataRow) {
    // Replace placeholders in format ${columnName}
    const applyData = (obj) => {
      if (typeof obj === 'string') {
        return obj.replace(/\$\{(\w+)\}/g, (match, key) => {
          return dataRow[key] !== undefined ? String(dataRow[key]) : match;
        });
      }

      if (Array.isArray(obj)) {
        return obj.map(item => applyData(item));
      }

      if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
          result[key] = applyData(obj[key]);
        }
        return result;
      }

      return obj;
    };

    return applyData(request);
  }

  /**
   * Build complete request URL with query parameters
   * @param {Object} request - Request configuration
   * @returns {string} Complete URL with query string
   */
  buildUrl(request) {
    let url = request.url;

    if (request.params && Object.keys(request.params).length > 0) {
      const queryString = new URLSearchParams(request.params).toString();
      url = url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
    }

    return url;
  }

  /**
   * Prepare request options for Playwright
   * @param {Object} request - Request configuration
   * @returns {Object} Playwright request options
   */
  preparePlaywrightOptions(request) {
    const options = {
      method: request.method || 'GET',
      headers: request.headers || {},
    };

    if (request.data) {
      // Handle different body types
      if (typeof request.data === 'object') {
        options.data = request.data;
        if (!options.headers['content-type']) {
          options.headers['content-type'] = 'application/json';
        }
      } else {
        options.data = request.data;
      }
    }

    return options;
  }
}

module.exports = { RequestModifier };