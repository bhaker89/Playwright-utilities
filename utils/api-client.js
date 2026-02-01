const { request } = require('@playwright/test');
const { logger } = require('./logger');
const { env } = require('../config/environment.config');

/**
 * @typedef {Object} APIResponse
 * @template T
 * @property {number} status
 * @property {string} statusText
 * @property {Record<string, string>} headers
 * @property {T} body
 * @property {number} responseTime
 */

/**
 * @typedef {Object} APIRequestOptions
 * @property {Record<string, string>} [headers]
 * @property {Record<string, string | number>} [params]
 * @property {number} [timeout]
 * @property {boolean} [ignoreHTTPSErrors]
 */

/**
 * Enhanced API Client for REST API testing
 */
class APIClient {
  /**
   * @param {string} [baseURL]
   * @param {Record<string, string>} [headers]
   */
  constructor(baseURL, headers) {
    /** @private @type {import('@playwright/test').APIRequestContext | null} */
    this.context = null;
    /** @private @type {string} */
    this.baseURL = baseURL || env.apiBaseURL;
    /** @private @type {Record<string, string>} */
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };
  }

  /**
   * Initialize the API request context
   * @param {Object} [options]
   * @param {string} [options.baseURL]
   * @param {Record<string, string>} [options.extraHTTPHeaders]
   * @param {boolean} [options.ignoreHTTPSErrors]
   * @returns {Promise<void>}
   */
  async init(options) {
    this.context = await request.newContext({
      baseURL: options?.baseURL || this.baseURL,
      extraHTTPHeaders: {
        ...this.defaultHeaders,
        ...options?.extraHTTPHeaders,
      },
      ignoreHTTPSErrors: options?.ignoreHTTPSErrors || false,
    });
    logger.info(`API Context initialized with baseURL: ${this.baseURL}`);
  }

  /**
   * Set authentication token
   * @param {string} token
   * @param {'Bearer' | 'Basic'} [type='Bearer']
   * @returns {void}
   */
  setAuthToken(token, type = 'Bearer') {
    this.defaultHeaders['Authorization'] = `${type} ${token}`;
    logger.info('Authentication token set');
  }

  /**
   * Set API key in headers
   * @param {string} key
   * @param {string} [headerName='X-API-Key']
   * @returns {void}
   */
  setAPIKey(key, headerName = 'X-API-Key') {
    this.defaultHeaders[headerName] = key;
    logger.info(`API key set in header: ${headerName}`);
  }

  /**
   * Set custom headers (multiple headers at once)
   * Useful for services requiring multiple custom headers like Order Nexus
   * @param {Record<string, string>} headers
   * @returns {void}
   */
  setCustomHeaders(headers) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    logger.info(`Custom headers set: ${Object.keys(headers).join(', ')}`);
  }

  /**
   * Set or change the base URL
   * Useful when testing multiple services with different base URLs
   * @param {string} url
   * @returns {void}
   */
  setBaseURL(url) {
    this.baseURL = url;
    logger.info(`Base URL updated to: ${url}`);
  }

  /**
   * Re-initialize context with current configuration
   * Call this after changing base URL or headers to apply changes
   * @returns {Promise<void>}
   */
  async reinit() {
    if (this.context) {
      await this.context.dispose();
    }
    await this.init({ baseURL: this.baseURL, extraHTTPHeaders: this.defaultHeaders });
    logger.info('API Context re-initialized with updated configuration');
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
   * Generic request method
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

    const startTime = Date.now();

    logger.info(`${method} ${endpoint}`);

    try {
      const response = await this.context.fetch(endpoint, {
        method,
        headers: { ...this.defaultHeaders, ...options?.headers },
        params: options?.params,
        data: options?.data,
        timeout: options?.timeout,
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
      };

      logger.info(`${method} ${endpoint} - ${response.status()} (${responseTime}ms)`);

      return apiResponse;
    } catch (error) {
      logger.error(`${method} ${endpoint} failed`, error);
      throw error;
    }
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
   * Dispose the API context
   * @returns {Promise<void>}
   */
  async dispose() {
    if (this.context) {
      await this.context.dispose();
      logger.info('API Context disposed');
    }
  }
}

module.exports = { APIClient };