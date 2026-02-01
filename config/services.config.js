/**
 * Multi-Microservice Configuration Registry
 * Supports 100+ microservices with dynamic configuration loading
 */

/**
 * @typedef {Object} ServiceEndpoints
 * @property {string} baseURL
 * @property {string} apiURL
 * @property {string} [healthCheck]
 * @property {string} [version]
 */

/**
 * @typedef {Object} ServiceConfig
 * @property {string} name
 * @property {string} displayName
 * @property {ServiceEndpoints} endpoints
 * @property {{ type: 'bearer' | 'basic' | 'apiKey' | 'oauth', credentials?: Record<string, string> }} [auth]
 * @property {number} [timeout]
 * @property {number} [retries]
 * @property {{ requestsPerSecond: number }} [rateLimit]
 */

/**
 * Service Registry - Central configuration for all microservices
 * Add new microservices here as your ecosystem grows
 */
class ServiceRegistry {
  /** @private @type {Map<string, ServiceConfig>} */
  static services = new Map();
  /** @private @type {string} */
  static environment = process.env.TEST_ENV || 'dev';

  /**
   * Register a microservice
   * @param {ServiceConfig} config
   * @returns {void}
   */
  static register(config) {
    this.services.set(config.name, config);
  }

  /**
   * Get service configuration by name
   * @param {string} serviceName
   * @returns {ServiceConfig}
   */
  static getService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not registered in ServiceRegistry`);
    }
    return service;
  }

  /**
   * Get all registered services
   * @returns {ServiceConfig[]}
   */
  static getAllServices() {
    return Array.from(this.services.values());
  }

  /**
   * Check if service exists
   * @param {string} serviceName
   * @returns {boolean}
   */
  static hasService(serviceName) {
    return this.services.has(serviceName);
  }

  /**
   * Initialize all services from configuration
   * @returns {void}
   */
  static initialize() {
    // Example microservices - Add your 100+ services here or load from external config
    this.registerDefaultServices();
  }

  /**
   * Register default services
   * @private
   * @returns {void}
   */
  static registerDefaultServices() {
    // User Service
    this.register({
      name: 'user-service',
      displayName: 'User Management Service',
      endpoints: {
        baseURL: process.env.USER_SERVICE_URL || 'https://user-service.example.com',
        apiURL: process.env.USER_SERVICE_API_URL || 'https://api.user-service.example.com',
        healthCheck: '/health',
        version: 'v1',
      },
      auth: { type: 'bearer' },
      timeout: 30000,
      retries: 3,
    });

    // Product Service
    this.register({
      name: 'product-service',
      displayName: 'Product Catalog Service',
      endpoints: {
        baseURL: process.env.PRODUCT_SERVICE_URL || 'https://product-service.example.com',
        apiURL: process.env.PRODUCT_SERVICE_API_URL || 'https://api.product-service.example.com',
        healthCheck: '/health',
        version: 'v1',
      },
      auth: { type: 'apiKey', credentials: { headerName: 'X-API-Key' } },
      timeout: 30000,
    });

    // Order Service
    this.register({
      name: 'order-service',
      displayName: 'Order Processing Service',
      endpoints: {
        baseURL: process.env.ORDER_SERVICE_URL || 'https://order-service.example.com',
        apiURL: process.env.ORDER_SERVICE_API_URL || 'https://api.order-service.example.com',
        healthCheck: '/health',
        version: 'v2',
      },
      timeout: 45000,
    });

    // Add more services as needed...
    // Payment Service, Notification Service, Analytics Service, etc.
  }
}

// Initialize on module load
ServiceRegistry.initialize();

module.exports = {
  ServiceRegistry,
};