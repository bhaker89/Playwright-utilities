const { request, chromium } = require('@playwright/test');
const { TestSuiteLoader } = require('../parsers/test-suite-loader');
const { CurlParser } = require('../parsers/curl-parser');
const { AssertionEngine } = require('../engines/assertion-engine');
const { VariableManager } = require('../engines/variable-manager');
const { RequestModifier } = require('../engines/request-modifier');
const { DataProvider } = require('../engines/data-provider');
const { UIEngine } = require('../engines/ui-engine');
const { ServiceConfigLoader } = require('./service-config-loader');
const registryLoader = require('./locator-registry-loader');
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
   * @param {Object} [options]
   * @param {string|null} [options.service] - Optional service override (e.g. from CLI)
   * @returns {Promise<void>}
   */
  async runTestSuite(testFilePath, options = {}) {
    // PHASE 4 LOCK: Disable direct YAML execution
    throw new Error(
      'Direct YAML execution disabled. Use TXT DSL pipeline.\n' +
      'Expected flow: TXT → intent spec YAML → execution\n' +
      'Run: npm run generate-from-dsl <dsl-file.txt> && npm run run-intent <intent-spec.yaml>'
    );

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Loading test suite: ${testFilePath}`);
    console.log('='.repeat(80));

    // Load service configurations
    await this.serviceConfigLoader.loadConfig();

    // Load test suite
    const testSuite = await this.loader.load(testFilePath);

    // Service override keeps backward compatibility: existing suites continue to work,
    // while automation-core can inject service via CLI/spec metadata.
    if (options.service) {
      testSuite.config = testSuite.config || {};
      testSuite.config.service = testSuite.config.service || options.service;
    }

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
      await this.runTestCase(testCase, baseUrl, testFilePath, testSuite.config, options);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Test Suite Execution Completed');
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Execute a single test case
   * @private
   */
  async runTestCase(testCase, baseUrl, testFilePath, suiteConfig, options) {
    // Check if test is data-driven
    if (testCase.data_driven) {
      await this.runDataDrivenTest(testCase, baseUrl, testFilePath, suiteConfig, options);
    } else {
      await this.runSingleTest(testCase, baseUrl, null, null, suiteConfig, testFilePath, options);
    }
  }

  /**
   * Execute single test (non-data-driven)
   * @private
   */
  async runSingleTest(
    testCase,
    baseUrl,
    dataRow = null,
    rowIndex = null,
    suiteConfig = null,
    testFilePath = null,
    options = {}
  ) {
    const testName = rowIndex !== null
      ? `${testCase.name} [Row ${rowIndex + 1}]`
      : testCase.name;

    console.log(`\n--- Running Test: ${testName} ---`);
    if (testCase.description) {
      console.log(`Description: ${testCase.description}`);
    }

    // Determine which service to use (test-level overrides suite-level)
    const serviceName = testCase.service || suiteConfig?.service || options.service;

    // If using service configuration, get the service config
    let serviceRequestConfig = null;
    if (serviceName) {
      console.log(`Using service: ${serviceName}`);
      serviceRequestConfig = this.serviceConfigLoader.getRequestConfig(
        serviceName,
        testCase.request?.endpoint
      );
    }

    // Branch between API and UI
    if (testCase.type === 'ui') {
      await this.runUITest(testCase, suiteConfig, testFilePath, serviceName);
      return;
    }

    // Existing API Logic...
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
      const requestOptions = this.requestModifier.preparePlaywrightOptions(request_config);

      console.log(`Method: ${requestOptions.method}`);
      console.log(`URL: ${url}`);
      console.log(`Headers: ${JSON.stringify(requestOptions.headers, null, 2)}`);
      if (requestOptions.data) {
        console.log(`Body: ${JSON.stringify(requestOptions.data, null, 2)}`);
      }

      // Execute request
      const startTime = Date.now();
      console.log('Sending request...');
      const response = await apiContext.fetch(url, requestOptions);
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
  async runDataDrivenTest(testCase, baseUrl, testFilePath, suiteConfig, options) {
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
      await this.runSingleTest(testCase, baseUrl, testData[i], i, suiteConfig, testFilePath, options);
    }
  }

  /**
   * Execute UI test by delegating to intent-runner.js
   * 
   * LOCKED EXECUTION PATH:
   * test-runner → intent-runner → UIEngine → SmartLocator → LocatorOrchestrator → LIE
   * 
   * @private
   */
  async runUITest(testCase, suiteConfig, testFilePath, serviceName) {
    console.log(`\n--- Starting UI Test: ${testCase.name} ---`);
    
    // Convert legacy test-runner YAML format to intent spec format
    const intentSpec = this._convertToIntentSpec(testCase, serviceName, testFilePath);
    
    // Delegate to intent-runner (the single entrypoint for all UI execution)
    const { runIntentSpec } = require('./intent-runner');
    
    try {
      // Create temporary intent spec file
      const tempSpecPath = path.join(process.cwd(), '.temp', `${Date.now()}-${testCase.name.replace(/\s+/g, '-')}.intent.yaml`);
      const fs = require('fs');
      const yaml = require('js-yaml');
      
      if (!fs.existsSync(path.dirname(tempSpecPath))) {
        fs.mkdirSync(path.dirname(tempSpecPath), { recursive: true });
      }
      
      fs.writeFileSync(tempSpecPath, yaml.dump(intentSpec), 'utf8');
      
      // Execute via intent-runner (enforced entrypoint)
      await runIntentSpec({
        specPath: tempSpecPath,
        service: serviceName,
        baseUrl: suiteConfig?.base_url,
        headless: suiteConfig?.headless !== false,
        strict: false,
      });
      
      // Cleanup temp file
      fs.unlinkSync(tempSpecPath);
      
      console.log(`UI Test "${testCase.name}" completed successfully ✓`);
    } catch (error) {
      console.error(`UI Test "${testCase.name}" failed ✗`);
      console.error(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert legacy test-runner test case to intent spec format
   * @private
   */
  _convertToIntentSpec(testCase, serviceName, testFilePath) {
    const featureName = testFilePath
      ? path.basename(testFilePath).replace(/\.(yaml|yml|json)$/i, '')
      : 'test-runner-legacy';

    return {
      metadata: {
        service: serviceName,
        generated_by: 'test-runner-adapter',
      },
      intent: {
        primary_action: testCase.name,
        feature: featureName,
      },
      steps: testCase.steps || [],
      assertions: testCase.assertions || [],
    };
  }

  /**
   * Execute test suite with Playwright config
   */
  async execute(config) {
    // Backward compatible: execute('/path/to/spec.yaml')
    if (typeof config === 'string') {
      await this.runTestSuite(config);
      return;
    }

    const { specPath, service } = config || {};
    await this.runTestSuite(specPath, { service });
  }
}

module.exports = { TestRunner };