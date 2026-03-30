const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

const { resolveFromRoot } = require('./workspace-root');

/**
 * Service Configuration Loader
 * Loads service configurations from services.yaml and applies environment-specific overrides
 */
class ServiceConfigLoader {
  constructor() {
    this.services = {};
    this.environment = process.env.TEST_ENV || 'stag';
    this.envVars = process.env;
    this.configLoaded = false;
  }

  /**
   * Load and parse service configurations
   * @param {string} configPath - Path to services.yaml (optional)
   * @returns {Promise<void>}
   */
  async loadConfig(configPath = null) {
    if (this.configLoaded) return;

    const defaultPath = resolveFromRoot('config', 'services.yaml');
    const filePath = configPath || defaultPath;

    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const config = yaml.load(fileContent);

      // Load all services
      this.services = config.services || {};

      // Apply environment-specific overrides
      if (config.environments && config.environments[this.environment]) {
        this.applyEnvironmentOverrides(config.environments[this.environment]);
      }

      // Replace environment variables in all services
      this.resolveEnvironmentVariables();

      this.configLoaded = true;
      console.log(`✓ Loaded ${Object.keys(this.services).length} service configurations (env: ${this.environment})`);
    } catch (error) {
      console.warn(`⚠ Could not load services config: ${error.message}`);
      console.warn('Tests will need to provide full configuration manually');
    }
  }

  /**
   * Apply environment-specific overrides
   * @private
   */
  applyEnvironmentOverrides(envConfig) {
    for (const [serviceName, overrides] of Object.entries(envConfig)) {
      if (this.services[serviceName]) {
        this.services[serviceName] = {
          ...this.services[serviceName],
          ...overrides
        };
      }
    }
  }

  /**
   * Resolve environment variables in configuration
   * Replaces ${VAR_NAME} with actual values from process.env
   * @private
   */
  resolveEnvironmentVariables() {
    for (const [serviceName, serviceConfig] of Object.entries(this.services)) {
      this.services[serviceName] = this.resolveObject(serviceConfig);
    }
  }

  /**
   * Recursively resolve environment variables in an object
   * @private
   */
  resolveObject(obj) {
    if (typeof obj === 'string') {
      return this.resolveString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObject(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
      const resolved = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveObject(value);
      }
      return resolved;
    }
    
    return obj;
  }

  /**
   * Resolve environment variables in a string
   * @private
   */
  resolveString(str) {
    if (typeof str !== 'string') return str;
    
    // Match ${VAR_NAME} pattern
    return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = this.envVars[varName];
      if (value === undefined || value === '') {
        console.warn(`⚠ Environment variable ${varName} not set, using empty string`);
        return '';
      }
      return value;
    });
  }

  /**
   * Get service configuration by name
   * @param {string} serviceName - Name of the service (e.g., 'nexus', 'user-service')
   * @returns {Object|null} Service configuration object
   */
  getService(serviceName) {
    if (!this.configLoaded) {
      throw new Error('Service config not loaded. Call loadConfig() first');
    }

    const service = this.services[serviceName];
    if (!service) {
      console.warn(`⚠ Service '${serviceName}' not found in configuration`);
      return null;
    }

    return { ...service }; // Return a copy to prevent mutations
  }

  /**
   * Get all available service names
   * @returns {string[]} Array of service names
   */
  getServiceNames() {
    return Object.keys(this.services);
  }

  /**
   * Get authentication headers for a service
   * @param {string} serviceName - Name of the service
   * @returns {Object} Headers object with Authorization/API key
   */
  getAuthHeaders(serviceName) {
    const service = this.getService(serviceName);
    if (!service || !service.auth) return {};

    const headers = {};
    const auth = service.auth;

    switch (auth.type) {
      case 'bearer':
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
        break;

      case 'basic':
        if (auth.username && auth.password) {
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'api_key':
        if (auth.api_key) {
          const headerName = auth.header_name || 'X-API-Key';
          headers[headerName] = auth.api_key;
        }
        break;

      case 'custom':
        // For custom auth, return the custom headers directly
        if (auth.headers) {
          Object.assign(headers, auth.headers);
        }
        break;

      case 'none':
      default:
        // No authentication
        break;
    }

    return headers;
  }

  /**
   * Get full request configuration for a service
   * Includes base_url, auth headers, default headers, timeout, etc.
   * @param {string} serviceName - Name of the service
   * @param {string} endpoint - Optional endpoint path or key
   * @returns {Object} Complete request configuration
   */
  getRequestConfig(serviceName, endpoint = null) {
    const service = this.getService(serviceName);
    if (!service) {
      return {
        base_url: '',
        headers: {},
        timeout: 30000
      };
    }

    // Build URL
    let url = service.base_url || '';
    if (endpoint) {
      // Check if endpoint is a key in the endpoints object
      if (service.endpoints && service.endpoints[endpoint]) {
        url += service.endpoints[endpoint];
      } else {
        // Treat it as a direct path
        url += endpoint;
      }
    }

    // Merge all headers (default + service-specific + auth)
    const headers = {
      ...(service.headers || {}),
      ...this.getAuthHeaders(serviceName)
    };

    return {
      base_url: service.base_url,
      url: url,
      headers: headers,
      timeout: service.timeout || 30000,
      retry: service.retry || { enabled: false, max_attempts: 1 }
    };
  }

  /**
   * Validate that all required environment variables are set
   * @param {string} serviceName - Name of the service to validate
   * @returns {Object} { valid: boolean, missing: string[] }
   */
  validateServiceConfig(serviceName) {
    const service = this.getService(serviceName);
    if (!service) {
      return { valid: false, missing: [`Service '${serviceName}' not found`] };
    }

    const missing = [];

    // Check base URL
    if (!service.base_url || service.base_url === '') {
      missing.push(`${serviceName}.base_url`);
    }

    // Check auth requirements
    if (service.auth) {
      const auth = service.auth;
      switch (auth.type) {
        case 'bearer':
          if (!auth.token || auth.token === '') {
            missing.push(`${serviceName}.auth.token`);
          }
          break;
        case 'basic':
          if (!auth.username || auth.username === '') {
            missing.push(`${serviceName}.auth.username`);
          }
          if (!auth.password || auth.password === '') {
            missing.push(`${serviceName}.auth.password`);
          }
          break;
        case 'api_key':
          if (!auth.api_key || auth.api_key === '') {
            missing.push(`${serviceName}.auth.api_key`);
          }
          break;
      }
    }

    return {
      valid: missing.length === 0,
      missing: missing
    };
  }

  /**
   * List all services and their configuration status
   * @returns {Object} Map of service names to their status
   */
  listServices() {
    const result = {};
    for (const serviceName of this.getServiceNames()) {
      const service = this.getService(serviceName);
      const validation = this.validateServiceConfig(serviceName);
      
      result[serviceName] = {
        name: service.name,
        base_url: service.base_url,
        auth_type: service.auth?.type || 'none',
        configured: validation.valid,
        missing: validation.missing
      };
    }
    return result;
  }
}

module.exports = { ServiceConfigLoader };