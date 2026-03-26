const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const { ServiceConfigLoader } = require('../core/service-config-loader');

/**
 * Loads and validates test suite files (YAML/JSON)
 */
class TestSuiteLoader {
  constructor() {
    this.serviceConfigLoader = new ServiceConfigLoader();
  }
  /**
   * Load a test suite from a file
   * @param {string} filePath - Path to the test suite file
   * @returns {Object} Parsed and validated test suite
   */
  load(filePath) {
    try {
      const absolutePath = path.resolve(filePath);

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Test suite file not found: ${filePath}`);
      }

      const content = fs.readFileSync(absolutePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();

      let suite;

      if (ext === '.yaml' || ext === '.yml') {
        suite = yaml.load(content);
      } else if (ext === '.json') {
        suite = JSON.parse(content);
      } else {
        throw new Error(`Unsupported file format: ${ext}. Use .yaml, .yml, or .json`);
      }

      this.validateTestSuite(suite, filePath);
      return suite;
    } catch (error) {
      throw new Error(`Failed to load test suite from ${filePath}: ${error.message}`);
    }
  }

  /**
   * Alias for load method for backward compatibility
   * @param {string} filePath - Path to the test suite file
   * @returns {Object} Parsed and validated test suite
   */
  loadTestSuite(filePath) {
    return this.load(filePath);
  }

  /**
   * Alias for load method for backward compatibility
   * @param {string} filePath - Path to the test suite file
   * @returns {Object} Parsed and validated test suite
   */
  loadTestSuite(filePath) {
    return this.load(filePath);
  }

  /**
   * Load all test suites from a directory
   * @param {string} dirPath - Directory path containing test suites
   * @returns {Array} Array of test suites
   */
  loadDirectory(dirPath) {
    const suites = [];

    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const files = this.getTestFiles(dirPath);

    for (const file of files) {
      try {
        const suite = this.load(file);
        suites.push(suite);
      } catch (error) {
        console.error(`Error loading ${file}: ${error.message}`);
      }
    }

    return suites;
  }

  /**
   * Recursively find all test files in directory
   * @param {string} dirPath - Directory to search
   * @returns {Array} Array of file paths
   * @private
   */
  getTestFiles(dirPath) {
    const files = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        files.push(...this.getTestFiles(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.yaml', '.yml', '.json'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Validate test suite structure
   * @param {Object} suite - Test suite object
   * @param {string} filePath - File path for error messages
   * @private
   */
  validateTestSuite(suite, filePath) {
    const errors = [];

    // Required fields
    if (!suite.name) {
      errors.push('Missing required field: name');
    }

    // Support both 'tests' and 'test_cases' formats
    const tests = suite.tests || suite.test_cases;

    if (!tests || !Array.isArray(tests)) {
      errors.push('Missing or invalid field: tests (must be an array)');
    } else {
      // Validate each test case
      tests.forEach((testCase, index) => {
        if (!testCase.name) {
          errors.push(`Test case ${index + 1}: Missing required field 'name'`);
        }

        if (!testCase.assertions || !Array.isArray(testCase.assertions)) {
          errors.push(`Test case ${index + 1} (${testCase.name || 'unnamed'}): Missing or invalid field 'assertions'`);
        } else if (testCase.assertions.length === 0) {
          errors.push(`Test case ${index + 1} (${testCase.name || 'unnamed'}): Must have at least one assertion`);
        } else {
          // Validate assertions
          testCase.assertions.forEach((assertion, assertionIndex) => {
            this.validateAssertion(assertion, assertionIndex, testCase.name || 'unnamed', errors);
          });
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(
        `Validation errors in ${filePath}:\n${errors.map(e => `  - ${e}`).join('\n')}`
      );
    }
  }

  /**
   * Validate individual assertion
   * @param {Object} assertion - Assertion object
   * @param {number} index - Assertion index
   * @param {string} testCaseName - Name of the test case
   * @param {Array} errors - Array to collect errors
   * @private
   */
  validateAssertion(assertion, index, testCaseName, errors) {
    const validTypes = ['status_code', 'json_path', 'response_time', 'header', 'schema', 'contains', 'regex', 'ui_visible', 'ui_text'];

    if (!assertion.type) {
      errors.push(`Test case '${testCaseName}', assertion ${index + 1}: Missing 'type' field`);
      return;
    }

    if (!validTypes.includes(assertion.type)) {
      errors.push(
        `Test case '${testCaseName}', assertion ${index + 1}: Invalid type '${assertion.type}'. Must be one of: ${validTypes.join(', ')}`
      );
    }

    // Type-specific validation
    switch (assertion.type) {
      case 'status_code':
        if (assertion.expected === undefined) {
          errors.push(`Test case '${testCaseName}', assertion ${index + 1}: status_code requires 'expected' field`);
        }
        break;

      case 'json_path':
        if (!assertion.path) {
          errors.push(`Test case '${testCaseName}', assertion ${index + 1}: json_path requires 'path' field`);
        }
        if (assertion.exists === undefined && assertion.expected === undefined && assertion.contains === undefined) {
          errors.push(
            `Test case '${testCaseName}', assertion ${index + 1}: json_path requires at least one of: 'exists', 'expected', or 'contains'`
          );
        }
        break;

      case 'response_time':
        if (!assertion.max_ms) {
          errors.push(`Test case '${testCaseName}', assertion ${index + 1}: response_time requires 'max_ms' field`);
        }
        break;

      case 'header':
        if (!assertion.header_name) {
          errors.push(`Test case '${testCaseName}', assertion ${index + 1}: header assertion requires 'header_name' field`);
        }
        break;

      case 'regex':
        if (!assertion.pattern) {
          errors.push(`Test case '${testCaseName}', assertion ${index + 1}: regex requires 'pattern' field`);
        }
        break;

      case 'schema':
        if (!assertion.schema) {
          errors.push(`Test case '${testCaseName}', assertion ${index + 1}: schema requires 'schema' field`);
        }
        break;
      case 'ui_visible':
        if (!assertion.selector) {
          errors.push(`Test case '${testCaseName}', assertion ${index + 1}: ui_visible requires 'selector' field`);
        }
        break;

      case 'ui_text':
        if (!assertion.selector) {
          errors.push(`Test case '${testCaseName}', assertion ${index + 1}: ui_text requires 'selector' field`);
        }
        if (assertion.expected === undefined) {
          errors.push(`Test case '${testCaseName}', assertion ${index + 1}: ui_text requires 'expected' field`);
        }
        break;
    }
  }
}

module.exports = { TestSuiteLoader };