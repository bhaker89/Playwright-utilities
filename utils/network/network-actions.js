const { expect } = require('@playwright/test');
const { logger } = require('../base/logger');

/**
 * ============================================================================
 * NETWORK ACTIONS - Network & API Testing Utilities
 * ============================================================================
 * 
 * This module provides reusable network utilities for Playwright tests:
 * - API response interception and validation
 * - Response capture for verification
 * - API mocking for isolated testing
 * - Broken link validation
 * 
 * USAGE:
 * ------
 * ```javascript
 * const { waitForApiResponse, mockApi, captureJsonResponse } = require('../utils/network/network-actions');
 * 
 * // In test
 * const response = await waitForApiResponse(page, { 
 *   urlContains: '/api/users', 
 *   status: 200 
 * });
 * 
 * const unmock = await mockApi(page, '**/api/config', { theme: 'dark' });
 * // ... test code
 * await unmock(); // Clean up
 * ```
 * ============================================================================
 */

// ============================================================================
// API RESPONSE WAITING & CAPTURE
// ============================================================================

/**
 * Wait for specific API response matching criteria
 * Returns the response object for further assertions
 * 
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {string} options.urlContains - URL pattern to match (substring)
 * @param {string} [options.method='GET'] - HTTP method
 * @param {number} [options.status] - Expected status code
 * @param {number} [options.timeout=30000] - Max wait time
 * @returns {Promise<import('@playwright/test').Response>}
 * 
 * @example
 * // Wait for user creation API
 * const response = await waitForApiResponse(page, {
 *   urlContains: '/api/users',
 *   method: 'POST',
 *   status: 201
 * });
 * 
 * const body = await response.json();
 * expect(body).toHaveProperty('id');
 */
async function waitForApiResponse(page, options) {
  const {
    urlContains,
    method = 'GET',
    status,
    timeout = 30000
  } = options;
  
  logger.info(`Waiting for API response: ${method} *${urlContains}* ${status ? `[${status}]` : ''}`);
  
  const response = await page.waitForResponse(
    (response) => {
      const urlMatch = response.url().includes(urlContains);
      const methodMatch = method ? response.request().method() === method.toUpperCase() : true;
      const statusMatch = status ? response.status() === status : true;
      
      return urlMatch && methodMatch && statusMatch;
    },
    { timeout }
  );
  
  logger.info(`API response received: ${response.status()} ${response.url()}`);
  
  return response;
}

/**
 * Capture JSON response body matching predicate
 * Useful when you need to extract data from network response for later use
 * 
 * @param {import('@playwright/test').Page} page
 * @param {Function} predicate - Function to match response (response) => boolean
 * @param {number} [timeout=30000] - Max wait time
 * @returns {Promise<Object>} Parsed JSON response body
 * 
 * @example
 * // Capture user ID from creation response
 * const userData = await captureJsonResponse(page, (response) => {
 *   return response.url().includes('/api/users') && 
 *          response.request().method() === 'POST';
 * });
 * 
 * console.log('Created user ID:', userData.id);
 */
async function captureJsonResponse(page, predicate, timeout = 30000) {
  logger.info('Waiting to capture JSON response...');
  
  const response = await page.waitForResponse(predicate, { timeout });
  const body = await response.json();
  
  logger.info(`JSON response captured from: ${response.url()}`);
  
  return body;
}

// ============================================================================
// API MOCKING
// ============================================================================

/**
 * Mock API endpoint with custom response
 * Returns a disposer function to remove the mock
 * 
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} urlPattern - URL pattern to intercept (glob or regex)
 * @param {Object|Function} handler - Mock response data or handler function
 * @param {Object} [options]
 * @param {number} [options.status=200] - Response status code
 * @param {Object} [options.headers] - Additional headers
 * @param {number} [options.delay=0] - Artificial delay in ms
 * @returns {Promise<Function>} Disposer function to remove mock
 * 
 * @example
 * // Mock with static JSON
 * const unmock = await mockApi(page, '**/api/config', {
 *   theme: 'dark',
 *   locale: 'en'
 * });
 * 
 * // Mock with dynamic handler
 * const unmock = await mockApi(page, '**/api/users/*', (route, request) => {
 *   const userId = request.url().split('/').pop();
 *   return { id: userId, name: 'Mock User' };
 * }, { status: 200 });
 * 
 * // Clean up mock
 * await unmock();
 */
async function mockApi(page, urlPattern, handler, options = {}) {
  const {
    status = 200,
    headers = { 'Content-Type': 'application/json' },
    delay = 0
  } = options;
  
  logger.info(`Setting up API mock: ${urlPattern}`);
  
  await page.route(urlPattern, async (route, request) => {
    // Add artificial delay if specified
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Handle function or static data
    const responseData = typeof handler === 'function' 
      ? await handler(route, request) 
      : handler;
    
    await route.fulfill({
      status,
      headers,
      body: JSON.stringify(responseData)
    });
    
    logger.info(`Mock response sent: ${request.method()} ${request.url()}`);
  });
  
  // Return disposer function
  return async () => {
    await page.unroute(urlPattern);
    logger.info(`API mock removed: ${urlPattern}`);
  };
}

/**
 * Mock API to fail with specific error
 * 
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} urlPattern - URL pattern to intercept
 * @param {number} [statusCode=500] - Error status code
 * @param {string} [errorMessage='Internal Server Error'] - Error message
 * @returns {Promise<Function>} Disposer function
 * 
 * @example
 * const unmock = await mockApiError(page, '**/api/users', 503, 'Service Unavailable');
 * // Test error handling
 * await unmock();
 */
async function mockApiError(page, urlPattern, statusCode = 500, errorMessage = 'Internal Server Error') {
  logger.info(`Setting up API error mock: ${urlPattern} [${statusCode}]`);
  
  return await mockApi(page, urlPattern, { error: errorMessage }, { status: statusCode });
}

// ============================================================================
// LINK VALIDATION
// ============================================================================

/**
 * Validate all links on page for broken links (404s, etc.)
 * Returns array of broken links for reporting
 * 
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').APIRequestContext} requestContext - Playwright request context
 * @param {Object} [options]
 * @param {string[]} [options.ignorePatterns=[]] - URL patterns to skip (e.g., ['mailto:', 'tel:', '#'])
 * @param {boolean} [options.checkExternal=false] - Whether to check external links
 * @param {number} [options.timeout=5000] - Timeout per link check
 * @returns {Promise<Array<{url: string, status: number, error?: string}>>} Array of broken links
 * 
 * @example
 * // In test with request fixture
 * test('validate links', async ({ page, request }) => {
 *   await page.goto('/');
 *   
 *   const brokenLinks = await validateBrokenLinks(page, request, {
 *     ignorePatterns: ['mailto:', 'tel:', '#', 'javascript:'],
 *     checkExternal: true
 *   });
 *   
 *   expect(brokenLinks).toHaveLength(0);
 *   
 *   if (brokenLinks.length > 0) {
 *     console.log('Broken links found:', brokenLinks);
 *   }
 * });
 */
async function validateBrokenLinks(page, requestContext, options = {}) {
  const {
    ignorePatterns = ['mailto:', 'tel:', '#', 'javascript:'],
    checkExternal = false,
    timeout = 5000
  } = options;
  
  logger.info('Starting link validation...');
  
  // Get all links on page
  const links = await page.locator('a[href]').evaluateAll((elements) =>
    elements.map(el => el.href).filter(href => href)
  );
  
  const uniqueLinks = [...new Set(links)];
  logger.info(`Found ${uniqueLinks.length} unique links`);
  
  // Filter links based on ignore patterns and external check
  const pageOrigin = new URL(page.url()).origin;
  const linksToCheck = uniqueLinks.filter(url => {
    // Skip ignored patterns
    if (ignorePatterns.some(pattern => url.startsWith(pattern))) {
      return false;
    }
    
    // Skip external links if not checking them
    if (!checkExternal) {
      try {
        const linkOrigin = new URL(url).origin;
        return linkOrigin === pageOrigin;
      } catch {
        return false;
      }
    }
    
    return true;
  });
  
  logger.info(`Checking ${linksToCheck.length} links...`);
  
  const brokenLinks = [];
  
  // Check links in parallel (with concurrency limit)
  const checkLink = async (url) => {
    try {
      const response = await requestContext.get(url, { timeout });
      const status = response.status();
      
      if (status >= 400) {
        logger.warn(`Broken link found: ${url} [${status}]`);
        brokenLinks.push({ url, status });
      }
    } catch (error) {
      logger.warn(`Link check failed: ${url} - ${error.message}`);
      brokenLinks.push({ url, status: 0, error: error.message });
    }
  };
  
  // Check links with concurrency limit of 5
  const concurrency = 5;
  for (let i = 0; i < linksToCheck.length; i += concurrency) {
    const batch = linksToCheck.slice(i, i + concurrency);
    await Promise.all(batch.map(checkLink));
  }
  
  if (brokenLinks.length === 0) {
    logger.info('✓ All links valid');
  } else {
    logger.warn(`✗ Found ${brokenLinks.length} broken links`);
  }
  
  return brokenLinks;
}

// ============================================================================
// NETWORK MONITORING
// ============================================================================

/**
 * Monitor all network requests and return collected data
 * Useful for debugging and performance analysis
 * 
 * @param {import('@playwright/test').Page} page
 * @param {Function} actionFn - Function to execute while monitoring
 * @returns {Promise<Array<{method: string, url: string, status: number, duration: number}>>}
 * 
 * @example
 * const requests = await monitorNetworkActivity(page, async () => {
 *   await page.click('#load-data');
 *   await page.waitForSelector('.data-loaded');
 * });
 * 
 * console.log(`Total requests: ${requests.length}`);
 * const apiCalls = requests.filter(r => r.url.includes('/api/'));
 * console.log(`API calls: ${apiCalls.length}`);
 */
async function monitorNetworkActivity(page, actionFn) {
  const requests = [];
  
  const requestListener = (request) => {
    const startTime = Date.now();
    
    request.response().then((response) => {
      if (response) {
        requests.push({
          method: request.method(),
          url: request.url(),
          status: response.status(),
          duration: Date.now() - startTime
        });
      }
    }).catch(() => {
      // Request failed or aborted
      requests.push({
        method: request.method(),
        url: request.url(),
        status: 0,
        duration: Date.now() - startTime
      });
    });
  };
  
  page.on('request', requestListener);
  
  try {
    await actionFn();
  } finally {
    page.off('request', requestListener);
  }
  
  logger.info(`Network monitoring complete: ${requests.length} requests captured`);
  
  return requests;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Response Waiting & Capture
  waitForApiResponse,
  captureJsonResponse,
  
  // API Mocking
  mockApi,
  mockApiError,
  
  // Link Validation
  validateBrokenLinks,
  
  // Network Monitoring
  monitorNetworkActivity,
};