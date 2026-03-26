const { request } = require('@playwright/test');
const { logger } = require('../base/logger');
const { env } = require('../../config/environment.config');

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
 * Wraps Playwright's native APIRequestContext for better tracing and reporting.
 */
class APIClient {
  /**
   * @param {import('@playwright/test').APIRequestContext} requestContext
   * @param {Record<string, string>} [headers]
   */
  constructor(requestContext, headers) {
    /** @private */
    this.context = requestContext;
    /** @private @type {Record<string, string>} */
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };
  }

  /**
   * Set authentication token manually (if needed to override global storageState)
   * @param {string} token
   * @param {'Bearer' | 'Basic'} [type='Bearer']
   */
  setAuthToken(token, type = 'Bearer') {
    this.defaultHeaders['Authorization'] = `${type} ${token}`;
    logger.info('Authentication token set (override)');
  }

  /**
   * Set Custom Headers
   * @param {Record<string, string>} headers
   */
  setCustomHeaders(headers) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
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
    const startTime = Date.now();
    logger.info(`${method} ${endpoint}`);

    try {
      // Use the native fetch which automatically integrates with Tracing/Reporting
      const response = await this.context.fetch(endpoint, {
        method,
        headers: { ...this.defaultHeaders, ...options?.headers },
        params: options?.params,
        data: options?.data,
        timeout: options?.timeout,
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

module.exports = { APIClient };