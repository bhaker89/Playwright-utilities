const { request } = require('@playwright/test');
const { logger } = require('./logger');
const { ServiceRegistry } = require('../config/services.config');

/**
 * @typedef {Object} APIResponse
 * @template T
 * @property {number} status
 * @property {string} statusText
 * @property {Record<string, string>} headers
 * @property {T} body
 * @property {number} responseTime
 * @property {string} serviceName
 */

/**
 * @typedef {Object} APIRequestOptions
 * @property {Record<string, string>} [headers]
 * @property {Record<string, string | number>} [params]
 * @property {number} [timeout]
 * @property {boolean} [ignoreHTTPSErrors]
 */

/**
 * Multi-Service API Client
 * Supports testing across multiple microservices with service-specific configurations
 * Uses Factory Pattern for service-specific client creation
 */
class MultiServiceAPIClient {
  /**
   * @param {string} serviceName
   * @param {Record<string, string>} [additionalHeaders]
   */
  constructor(serviceName, additionalHeaders) {
    /** @private @type {import('@playwright/test').APIRequestContext | null} */
    this.context = null;
    /** @private @type {import('../config/services.config').ServiceConfig} */
    this.serviceConfig = ServiceRegistry.getService(serviceName);
    /** @private @type {Record<string, string>} */
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...additionalHeaders,
    };
  }

  /**
   * Initialize the API request context for this service
   * @param {Object} [options]
   * @param {Record<string, string>} [options.extraHTTPHeaders]
   * @param {boolean} [options.ignoreHTTPSErrors]
   * @returns {Promise<void>}
   */
  async init(options) {
    this.context = await request.newContext({
      baseURL: this.serviceConfig.endpoints.apiURL,
      extraHTTPHeaders: {
        ...this.defaultHeaders,
        ...options?.extraHTTPHeaders,
      },
      ignoreHTTPSErrors: options?.ignoreHTTPSErrors || false,
      timeout: this.serviceConfig.timeout || 30000,
    });
    logger.info(`API Context initialized for service: ${this.serviceConfig.displayName}`);
  }

  /**
   * Set authentication based on service configuration
   * @param {string} token
   * @returns {void}
   */
  setAuth(token) {
    if (!this.serviceConfig.auth) return;

    switch (this.serviceConfig.auth.type) {
      case 'bearer':
        this.defaultHeaders['Authorization'] = `Bearer ${token}`;
        break;
      case 'basic':
        this.defaultHeaders['Authorization'] = `Basic ${token}`;
        break;
      case 'apiKey':
        const headerName = this.serviceConfig.auth.credentials?.headerName || 'X-API-Key';
        this.defaultHeaders[headerName] = token;
        break;
      case 'oauth':
        this.defaultHeaders['Authorization'] = `Bearer ${token}`;
        break;
    }
    logger.info(`Authentication set for ${this.serviceConfig.name}`);
  }

  /**
   * GET request
   * @template T
   * @param {string} endpoint
   * @param {APIRequestOptions} [options]
   * @returns {Promise<APIResponse<T>>}
   */
  async get(endpoint, options) {
    return this.request('GET', endpoint, options);
  }

  /**
   * POST request
   * @template T
   * @param {string} endpoint
   * @param {any} [data]
   * @param {APIRequestOptions} [options]
   * @returns {Promise<APIResponse<T>>}
   */
  async post(endpoint, data, options) {
    return this.request('POST', endpoint, { ...options, data });
  }

  /**
   * PUT request
   * @template T
   * @param {string} endpoint
   * @param {any} [data]
   * @param {APIRequestOptions} [options]
   * @returns {Promise<APIResponse<T>>}
   */
  async put(endpoint, data, options) {
    return this.request('PUT', endpoint, { ...options, data });
  }

  /**
   * PATCH request
   * @template T
   * @param {string} endpoint
   * @param {any} [data]
   * @param {APIRequestOptions} [options]
   * @returns {Promise<APIResponse<T>>}
   */
  async patch(endpoint, data, options) {
    return this.request('PATCH', endpoint, { ...options, data });
  }

  /**
   * DELETE request
   * @template T
   * @param {string} endpoint
   * @param {APIRequestOptions} [options]
   * @returns {Promise<APIResponse<T>>}
   */
  async delete(endpoint, options) {
    return this.request('DELETE', endpoint, options);
  }

  /**
   * Health check for the service
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    if (!this.serviceConfig.endpoints.healthCheck) {
      logger.warn(`No health check endpoint configured for ${this.serviceConfig.name}`);
      return false;
    }

    try {
      const response = await this.get(this.serviceConfig.endpoints.healthCheck);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      logger.error(`Health check failed for ${this.serviceConfig.name}`, error);
      return false;
    }
  }

  /**
   * Generic request method with retry logic
   * @private
   * @template T
   * @param {string} method
   * @param {string} endpoint
   * @param {APIRequestOptions & { data?: any }} [options]
   * @returns {Promise<APIResponse<T>>}
   */
  async request(method, endpoint, options) {
    if (!this.context) {
      await this.init();
    }

    const maxRetries = this.serviceConfig.retries || 1;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        logger.info(`[${this.serviceConfig.name}] ${method} ${endpoint} (Attempt ${attempt}/${maxRetries})`);

        const response = await this.context.fetch(endpoint, {
          method,
          headers: { ...this.defaultHeaders, ...options?.headers },
          params: options?.params,
          data: options?.data,
          timeout: options?.timeout || this.serviceConfig.timeout,
          ignoreHTTPSErrors: options?.ignoreHTTPSErrors,
        });

        const responseTime = Date.now() - startTime;
        const body = await this.parseResponse(response);

        /** @type {APIResponse<T>} */
        const apiResponse = {
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
          body,
          responseTime,
          serviceName: this.serviceConfig.name,
        };

        logger.info(`[${this.serviceConfig.name}] ${method} ${endpoint} - ${response.status()} (${responseTime}ms)`);
        return apiResponse;

      } catch (error) {
        lastError = error;
        logger.warn(`[${this.serviceConfig.name}] Attempt ${attempt} failed`, error);

        if (attempt < maxRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    logger.error(`[${this.serviceConfig.name}] ${method} ${endpoint} failed after ${maxRetries} attempts`);
    throw lastError;
  }

  /**
   * Parse response body
   * @private
   * @template T
   * @param {any} response
   * @returns {Promise<T>}
   */
  async parseResponse(response) {
    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  }

  /**
   * Get service configuration
   * @returns {import('../config/services.config').ServiceConfig}
   */
  getServiceConfig() {
    return this.serviceConfig;
  }

  /**
   * Dispose the API context
   * @returns {Promise<void>}
   */
  async dispose() {
    if (this.context) {
      await this.context.dispose();
      logger.info(`[${this.serviceConfig.name}] API Context disposed`);
    }
  }
}

/**
 * Factory for creating service-specific API clients
 */
class APIClientFactory {
  /** @private @type {Map<string, MultiServiceAPIClient>} */
  static clients = new Map();

  /**
   * Get or create API client for a specific service
   * @param {string} serviceName
   * @returns {Promise<MultiServiceAPIClient>}
   */
  static async getClient(serviceName) {
    if (!this.clients.has(serviceName)) {
      const client = new MultiServiceAPIClient(serviceName);
      await client.init();
      this.clients.set(serviceName, client);
    }
    return this.clients.get(serviceName);
  }

  /**
   * Dispose all clients
   * @returns {Promise<void>}
   */
  static async disposeAll() {
    for (const client of this.clients.values()) {
      await client.dispose();
    }
    this.clients.clear();
  }
}

module.exports = {
  MultiServiceAPIClient,
  APIClientFactory,
};