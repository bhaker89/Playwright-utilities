const { JSONPath } = require('jsonpath-plus');
const Ajv = require('ajv');

/**
 * Assertion Engine - Validates API responses against defined assertions
 */
class AssertionEngine {
  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * Execute all assertions for a test case
   * @param {Object} response - Playwright APIResponse object (optional for UI)
   * @param {Array} assertions - Array of assertion objects
   * @param {number} startTime - Test start timestamp
   * @param {import('@playwright/test').Page} [page] - Playwright Page object (optional for API)
   * @returns {Promise<Array>} Array of assertion results
   */
  async executeAssertions(response, assertions, startTime, page = null) {
    const results = [];
    const responseBody = response ? await this.getResponseBody(response) : null;
    const responseTime = Date.now() - startTime;

    for (const assertion of assertions) {
      try {
        const result = await this.executeAssertion(
          assertion,
          response,
          responseBody,
          responseTime,
          page
        );
        results.push(result);
      } catch (error) {
        results.push({
          type: assertion.type,
          passed: false,
          message: `Assertion execution failed: ${error.message}`,
        });
      }
    }

    return results;
  }

  /**
   * Execute a single assertion
   * @private
   */
  async executeAssertion(assertion, response, responseBody, responseTime, page = null) {
    switch (assertion.type) {
      case 'ui_visible':
        return await this.assertUiVisible(page, assertion);

      case 'ui_text':
        return await this.assertUiText(page, assertion);

      case 'status_code':
        return this.assertStatusCode(response, assertion);

      case 'json_path':
        return this.assertJsonPath(responseBody, assertion);

      case 'response_time':
        return this.assertResponseTime(responseTime, assertion);

      case 'header':
        return this.assertHeader(response, assertion);

      case 'schema':
        return this.assertSchema(responseBody, assertion);

      case 'contains':
        return this.assertContains(responseBody, assertion);

      case 'regex':
        return this.assertRegex(responseBody, assertion);

      default:
        throw new Error(`Unknown assertion type: ${assertion.type}`);
    }
  }

  /**
   * Assert HTTP status code
   * @private
   */
  assertStatusCode(response, assertion) {
    const actual = response.status();
    const expected = assertion.expected;
    const passed = actual === expected;

    return {
      type: 'status_code',
      passed,
      expected,
      actual,
      message: passed
        ? `Status code is ${expected}`
        : `Expected status code ${expected}, but got ${actual}`,
    };
  }

  /**
   * Assert JSON path expressions
   * @private
   */
  assertJsonPath(responseBody, assertion) {
    try {
      const result = JSONPath({ path: assertion.path, json: responseBody });

      // Check existence
      if (assertion.exists !== undefined) {
        const exists = result.length > 0;
        const passed = exists === assertion.exists;
        return {
          type: 'json_path',
          passed,
          expected: assertion.exists,
          actual: exists,
          message: passed
            ? `Path '${assertion.path}' existence check passed`
            : `Path '${assertion.path}' expected to ${assertion.exists ? 'exist' : 'not exist'}, but ${exists ? 'exists' : 'does not exist'}`,
        };
      }

      // Check expected value
      if (assertion.expected !== undefined) {
        const actual = result[0];
        const passed = this.deepEqual(actual, assertion.expected);
        return {
          type: 'json_path',
          passed,
          expected: assertion.expected,
          actual,
          message: passed
            ? `Path '${assertion.path}' matches expected value`
            : `Path '${assertion.path}' expected ${JSON.stringify(assertion.expected)}, but got ${JSON.stringify(actual)}`,
        };
      }

      // Check contains
      if (assertion.contains !== undefined) {
        const actual = result[0];
        const actualStr = typeof actual === 'string' ? actual : JSON.stringify(actual);
        const passed = actualStr.includes(assertion.contains);
        return {
          type: 'json_path',
          passed,
          expected: `contains '${assertion.contains}'`,
          actual: actualStr,
          message: passed
            ? `Path '${assertion.path}' contains expected text`
            : `Path '${assertion.path}' does not contain '${assertion.contains}'`,
        };
      }

      return {
        type: 'json_path',
        passed: false,
        message: `JSON path assertion requires 'exists', 'expected', or 'contains' field`,
      };
    } catch (error) {
      return {
        type: 'json_path',
        passed: false,
        message: `JSON path evaluation failed: ${error.message}`,
      };
    }
  }

  /**
   * Assert response time
   * @private
   */
  assertResponseTime(responseTime, assertion) {
    const passed = responseTime <= assertion.max_ms;
    return {
      type: 'response_time',
      passed,
      expected: `<= ${assertion.max_ms}ms`,
      actual: `${responseTime}ms`,
      message: passed
        ? `Response time ${responseTime}ms is within limit`
        : `Response time ${responseTime}ms exceeds maximum ${assertion.max_ms}ms`,
    };
  }

  /**
   * Assert response headers
   * @private
   */
  assertHeader(response, assertion) {
    const headers = response.headers();
    const headerName = assertion.header_name;
    const actual = headers[headerName.toLowerCase()];

    if (assertion.expected !== undefined) {
      const passed = actual === assertion.expected;
      return {
        type: 'header',
        passed,
        expected: assertion.expected,
        actual,
        message: passed
          ? `Header '${headerName}' matches expected value`
          : `Header '${headerName}' expected '${assertion.expected}', but got '${actual}'`,
      };
    }

    if (assertion.exists !== undefined) {
      const exists = actual !== undefined;
      const passed = exists === assertion.exists;
      return {
        type: 'header',
        passed,
        expected: assertion.exists,
        actual: exists,
        message: passed
          ? `Header '${headerName}' existence check passed`
          : `Header '${headerName}' expected to ${assertion.exists ? 'exist' : 'not exist'}`,
      };
    }

    if (assertion.contains !== undefined) {
      const passed = actual?.includes(assertion.contains) || false;
      return {
        type: 'header',
        passed,
        expected: `contains '${assertion.contains}'`,
        actual,
        message: passed
          ? `Header '${headerName}' contains expected text`
          : `Header '${headerName}' does not contain '${assertion.contains}'`,
      };
    }

    return {
      type: 'header',
      passed: false,
      message: `Header assertion requires 'expected', 'exists', or 'contains' field`,
    };
  }

  /**
   * Assert JSON schema validation
   * @private
   */
  assertSchema(responseBody, assertion) {
    try {
      const validate = this.ajv.compile(assertion.schema);
      const passed = validate(responseBody);

      return {
        type: 'schema',
        passed,
        message: passed
          ? 'Response matches schema'
          : `Schema validation failed: ${this.ajv.errorsText(validate.errors)}`,
      };
    } catch (error) {
      return {
        type: 'schema',
        passed: false,
        message: `Schema validation error: ${error.message}`,
      };
    }
  }

  /**
   * Assert response contains text
   * @private
   */
  assertContains(responseBody, assertion) {
    const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
    const passed = bodyStr.includes(assertion.contains);

    return {
      type: 'contains',
      passed,
      expected: `contains '${assertion.contains}'`,
      actual: bodyStr.substring(0, 200) + '...',
      message: passed
        ? `Response contains '${assertion.contains}'`
        : `Response does not contain '${assertion.contains}'`,
    };
  }

  /**
   * Assert regex pattern match
   * @private
   */
  assertRegex(responseBody, assertion) {
    try {
      const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
      const regex = new RegExp(assertion.pattern);
      const passed = regex.test(bodyStr);

      return {
        type: 'regex',
        passed,
        expected: `matches pattern '${assertion.pattern}'`,
        actual: bodyStr.substring(0, 200) + '...',
        message: passed
          ? `Response matches regex pattern`
          : `Response does not match regex pattern '${assertion.pattern}'`,
      };
    } catch (error) {
      return {
        type: 'regex',
        passed: false,
        message: `Regex evaluation failed: ${error.message}`,
      };
    }
  }

  /**
   * Assert UI element visibility
   * @private
   */
  async assertUiVisible(page, assertion) {
    if (!page) throw new Error('UI assertion requires a page object');
    const isVisible = await page.isVisible(assertion.selector);
    const passed = isVisible === (assertion.expected !== false);

    return {
      type: 'ui_visible',
      passed,
      message: passed
        ? `Element "${assertion.selector}" is visible as expected`
        : `Element "${assertion.selector}" visibility mismatch`,
    };
  }

  /**
   * Assert UI element text
   * @private
   */
  async assertUiText(page, assertion) {
    if (!page) throw new Error('UI assertion requires a page object');
    const actual = await page.textContent(assertion.selector);
    const passed = actual.includes(assertion.expected);

    return {
      type: 'ui_text',
      passed,
      expected: assertion.expected,
      actual,
      message: passed
        ? `Element "${assertion.selector}" contains expected text`
        : `Element "${assertion.selector}" expected to contain "${assertion.expected}", but got "${actual}"`,
    };
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
   * Deep equality check
   * @private
   */
  deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}

module.exports = { AssertionEngine };