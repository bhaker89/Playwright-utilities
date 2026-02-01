const { request } = require('@playwright/test');
const { TestSuiteLoader } = require('../parsers/test-suite-loader');
const { CurlParser } = require('../parsers/curl-parser');
const { AssertionEngine } = require('../engine/assertion-engine');
const { VariableManager } = require('../engine/variable-manager');
const { RequestModifier } = require('../engine/request-modifier');
const { DataProvider } = require('../engine/data-provider');
const { ServiceConfigLoader } = require('../config/service-config-loader');
const path = require('path');

/**
 * Test Runner - Main test execution engine
 */
class TestRunner {
  constructor() {
    this.loader = new TestSuiteLoader();
    this.curlParser = new CurlParser();
    this.assertionEngine = new AssertionEngine();
    this.variableManager = new VariableManager();
    this.requestModifier = new RequestModifier(this.variableManager);
    this.dataProvider = new DataProvider();
    this.serviceConfigLoader = new ServiceConfigLoader();
  }

  /**
   * Execute test suite from file
   * @param {string} testFilePath - Path to test suite YAML/JSON file
   * @returns {Promise<void>}
   */
  async runTestSuite(testFilePath) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Loading test suite: ${testFilePath}`);
    console.log('='.repeat(80));

    // Load service configurations
    await this.serviceConfigLoader.loadConfig();

    // Load test suite
    const testSuite = await this.loader.load(testFilePath);

    console.log(`Suite: ${testSuite.name}`);
    console.log(`Description: ${testSuite.description || 'N/A'}`);
    
    // Handle service-based configuration
    const defaultService = testSuite.config?.service;
    if (defaultService) {
      console.log(`Service: ${defaultService}`);
      const serviceConfig = this.serviceConfigLoader.getService(defaultService);
      if (serviceConfig) {
        console.log(`Base URL: ${serviceConfig.base_url}`);
        console.log(`Auth Type: ${serviceConfig.auth?.type || 'none'}`);
      }
    } else {
      console.log(`Base URL: ${testSuite.config?.base_url || 'N/A'}`);
    }
    
    console.log(`Total Tests: ${testSuite.tests.length}`);
    console.log('='.repeat(80));

    // Set up base URL (for backward compatibility)
    const baseUrl = testSuite.config?.base_url || '';

    // Execute each test
    for (const testCase of testSuite.tests) {
      await this.runTestCase(testCase, baseUrl, testFilePath, testSuite.config);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Test Suite Execution Completed');
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Execute a single test case
   * @private
   */
  async runTestCase(testCase, baseUrl, testFilePath, suiteConfig) {
    // Check if test is data-driven
    if (testCase.data_driven) {
      await this.runDataDrivenTest(testCase, baseUrl, testFilePath, suiteConfig);
    } else {
      await this.runSingleTest(testCase, baseUrl, null, null, suiteConfig);
    }
  }

  /**
   * Execute single test (non-data-driven)
   * @private
   */
  async runSingleTest(testCase, baseUrl, dataRow = null, rowIndex = null, suiteConfig = null) {
    const testName = rowIndex !== null 
      ? `${testCase.name} [Row ${rowIndex + 1}]`
      : testCase.name;

    console.log(`\n--- Running Test: ${testName} ---`);
    if (testCase.description) {
      console.log(`Description: ${testCase.description}`);
    }

    // Determine which service to use (test-level overrides suite-level)
    const serviceName = testCase.service || suiteConfig?.service;
    
    // If using service configuration, get the service config
    let serviceRequestConfig = null;
    if (serviceName) {
      console.log(`Using service: ${serviceName}`);
      serviceRequestConfig = this.serviceConfigLoader.getRequestConfig(
        serviceName,
        testCase.request?.endpoint
      );
    }

    // Create API request context
    const apiContext = await request.newContext();

    try {
      // Parse request (from curl or request object)
      let request_config;
      if (testCase.request?.curl) {
        console.log('Parsing cURL command...');
        request_config = this.curlParser.parse(testCase.request.curl);
      } else {
        request_config = { ...testCase.request };
      }

      // Apply service configuration if available
      if (serviceRequestConfig) {
        // Use service URL if endpoint is specified
        if (request_config.endpoint) {
          request_config.url = serviceRequestConfig.url;
          delete request_config.endpoint; // Remove endpoint after using it
        }
        
        // Merge headers (service headers + test headers)
        request_config.headers = {
          ...serviceRequestConfig.headers,
          ...(request_config.headers || {})
        };
        
        // Set timeout from service config if not specified
        if (!request_config.timeout) {
          request_config.timeout = serviceRequestConfig.timeout;
        }
      }

      // Apply base URL if relative URL (backward compatibility)
      if (baseUrl && request_config.url && !request_config.url.startsWith('http')) {
        request_config.url = baseUrl + request_config.url;
      }

      // Apply request modifications
      if (testCase.request?.modify) {
        request_config = this.requestModifier.modifyRequest(
          request_config,
          testCase.request.modify,
          dataRow
        );
      } else if (dataRow) {
        request_config = this.requestModifier.modifyRequest(
          request_config,
          {},
          dataRow
        );
      }

      // Build final URL and options
      const url = this.requestModifier.buildUrl(request_config);
      const options = this.requestModifier.preparePlaywrightOptions(request_config);

      console.log(`Method: ${options.method}`);
      console.log(`URL: ${url}`);
      console.log(`Headers: ${JSON.stringify(options.headers, null, 2)}`);
      if (options.data) {
        console.log(`Body: ${JSON.stringify(options.data, null, 2)}`);
      }

      // Execute request
      const startTime = Date.now();
      console.log('Sending request...');
      const response = await apiContext.fetch(url, options);
      const responseTime = Date.now() - startTime;

      console.log(`Response Status: ${response.status()}`);
      console.log(`Response Time: ${responseTime}ms`);

      // Extract variables
      if (testCase.extract) {
        console.log('Extracting variables...');
        await this.variableManager.extractVariables(response, testCase.extract);
      }

      // Execute assertions
      if (testCase.assertions && testCase.assertions.length > 0) {
        console.log('Executing assertions...');
        const assertionResults = await this.assertionEngine.executeAssertions(
          response,
          testCase.assertions,
          startTime
        );

        // Log assertion results
        for (const result of assertionResults) {
          const status = result.passed ? '✓ PASS' : '✗ FAIL';
          console.log(`  ${status}: ${result.message}`);
          
          // Throw error if assertion failed
          if (!result.passed) {
            throw new Error(`Assertion failed: ${result.message}`);
          }
        }
      }

      console.log(`Test "${testName}" completed successfully ✓`);
    } catch (error) {
      console.error(`Test "${testName}" failed ✗`);
      console.error(`Error: ${error.message}`);
      throw error;
    } finally {
      await apiContext.dispose();
    }
  }

  /**
   * Execute data-driven test
   * @private
   */
  async runDataDrivenTest(testCase, baseUrl, testFilePath, suiteConfig) {
    console.log(`\n--- Loading test data for: ${testCase.name} ---`);
    
    // Resolve data file path relative to test file
    const testDir = path.dirname(testFilePath);
    const dataFilePath = path.resolve(testDir, testCase.data_driven.source);

    console.log(`Data file: ${dataFilePath}`);

    // Load test data
    const testData = await this.dataProvider.loadData(dataFilePath);
    console.log(`Loaded ${testData.length} data rows`);

    // Run test for each data row
    for (let i = 0; i < testData.length; i++) {
      await this.runSingleTest(testCase, baseUrl, testData[i], i, suiteConfig);
    }
  }

  /**
   * Execute test suite with Playwright config
   * @param {string} testFilePath - Path to test suite file
   * @returns {Promise<void>}
   */
  async execute(testFilePath) {
    await this.runTestSuite(testFilePath);
  }
}

module.exports = { TestRunner };