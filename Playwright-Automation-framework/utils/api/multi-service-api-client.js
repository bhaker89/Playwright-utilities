const { request } = require('@playwright/test');
const { logger } = require('../base/logger');
const { ServiceRegistry } = require('../../config/services.config');

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
 * Modernized to wrap Playwright's native APIRequestContext.
 */
class MultiServiceAPIClient {
  /**
   * @param {string} serviceName
   * @param {import('@playwright/test').APIRequestContext} requestContext
   * @param {Record<string, string>} [additionalHeaders]
   */
  constructor(serviceName, requestContext, additionalHeaders) {
    /** @private */
    this.context = requestContext;
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
   * Set authentication based on service configuration
   * @param {string} token
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
   * Generic request method with retry logic
   * @private
   * @template T
   * @param {string} method
   * @param {string} endpoint
   * @param {APIRequestOptions & { data?: any }} [options]
   * @returns {Promise<APIResponse<T>>}
   */
  async request(method, endpoint, options) {
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

    throw lastError;
  }

  /**
   * Parse response body
   * @private
   * @template T
   * @param {import('@playwright/test').APIResponse} response
   * @returns {Promise<T>}
   */
  async parseResponse(response) {
    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  }
}

/**
 * Factory for creating service-specific API clients
 */
class APIClientFactory {
  /**
   * Create an API client for a specific service using a provided native context
   * @param {string} serviceName
   * @param {import('@playwright/test').APIRequestContext} requestContext
   * @returns {MultiServiceAPIClient}
   */
  static createClient(serviceName, requestContext) {
    return new MultiServiceAPIClient(serviceName, requestContext);
  }
}

module.exports = {
  MultiServiceAPIClient,
  APIClientFactory,
};

module.exports = {
  MultiServiceAPIClient,
  APIClientFactory,
};