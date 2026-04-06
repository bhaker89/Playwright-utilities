const { CurlParser } = require('../parsers/curl-parser');
const { ApiHelperGenerator } = require('../generators/api-helper-generator');
const { ApiExecutor } = require('../engines/api-executor');
const { OpenApiGenerator } = require('../generators/openapi-generator');
const { TestCodeGenerator } = require('../generators/test-code-generator');
const { TestRunner } = require('./test-runner');
const { logger } = require('../../utils/base/logger');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * ============================================================================
 * ORCHESTRATOR - Main Flow Coordinator
 * ============================================================================
 * 
 * Coordinates the complete flow:
 * 1. Parse cURL command
 * 2. Generate API helper method code
 * 3. Execute API and capture response
 * 4. Generate OpenAPI spec (source of truth)
 * 5. Generate test code via LLM
 * 
 * USAGE:
 * ------
 * ```javascript
 * const orchestrator = new Orchestrator();
 * await orchestrator.generateFromCurl({
 *   curlCommand: 'curl -X POST ...',
 *   serviceName: 'payment-service',
 *   apiName: 'process-payment'
 * });
 * ```
 * ============================================================================
 */

class Orchestrator {
  constructor() {
    this.curlParser = new CurlParser();
    this.apiHelperGenerator = new ApiHelperGenerator();
    this.apiExecutor = new ApiExecutor();
    this.openApiGenerator = new OpenApiGenerator();
    this.testCodeGenerator = new TestCodeGenerator();

    // Used by automation-core CLI to execute YAML specs without changing existing flows.
    this.testRunner = new TestRunner();
  }

  /**
   * Execute a YAML spec file (service-aware).
   *
   * Backward compatible behavior:
   * - If called with a string, treat it as specPath and run with no explicit service.
   * - If called with { specPath, service }, resolve service priority:
   *   CLI service > spec.metadata.service > null.
   */
  async run(config) {
    if (typeof config === 'string') {
      return this.testRunner.execute(config);
    }

    const { specPath, service: cliService } = config || {};

    if (!specPath) {
      throw new Error('Missing required argument: specPath');
    }

    const spec = yaml.load(fs.readFileSync(specPath, 'utf8'));

    const resolvedService =
      cliService ||
      spec?.metadata?.service ||
      null;

    return this.testRunner.execute({
      specPath,
      service: resolvedService,
    });
  }
=======

  /**
   * Main orchestration method
   * @param {Object} options
   * @param {string} options.curlCommand - The cURL command to process
   * @param {string} options.serviceName - Service name (e.g., 'payment-service')
   * @param {string} options.apiName - API name (e.g., 'process-payment')
   * @param {boolean} [options.skipExecution=false] - Skip API execution (use mock)
   * @param {string} [options.llmProvider='openai'] - LLM provider (openai/claude/ollama)
   * @returns {Promise<Object>} Generated artifacts info
   */
  async generateFromCurl(options) {
    const {
      curlCommand,
      serviceName,
      apiName,
      skipExecution = false,
      llmProvider = 'openai'
    } = options;

    logger.info('🚀 Starting API Test Generation Flow');
    logger.info('='.repeat(80));
    logger.info(`Service: ${serviceName}`);
    logger.info(`API: ${apiName}`);
    logger.info('='.repeat(80));

    const result = {
      success: false,
      steps: {},
      artifacts: {}
    };

    try {
      // ========================================================================
      // STEP 1: Parse cURL Command
      // ========================================================================
      logger.info('\n📋 STEP 1: Parsing cURL command...');
      const parsedRequest = this.curlParser.parseCommand(curlCommand, apiName);
      
      logger.info('✓ cURL parsed successfully');
      logger.info(`  Method: ${parsedRequest.method}`);
      logger.info(`  URL: ${parsedRequest.url}`);
      logger.info(`  Headers: ${Object.keys(parsedRequest.headers || {}).length} headers`);
      logger.info(`  Body: ${parsedRequest.body ? 'Present' : 'None'}`);
      
      result.steps.step1 = { success: true, parsedRequest };

      // ========================================================================
      // STEP 1.5: Generate API Helper Method
      // ========================================================================
      logger.info('\n🔧 STEP 1.5: Generating API helper method...');
      const helperInfo = await this.apiHelperGenerator.generateHelperMethod(
        parsedRequest,
        serviceName,
        apiName
      );
      
      logger.info('✓ Helper method generated successfully');
      logger.info(`  File: ${helperInfo.filePath}`);
      logger.info(`  Class: ${helperInfo.helperClass}`);
      logger.info(`  Method: ${helperInfo.methodName}()`);
      
      result.steps.step1_5 = { success: true, helperInfo };
      result.artifacts.helperFile = helperInfo.filePath;

      // ========================================================================
      // STEP 2: Execute API and Capture Response
      // ========================================================================
      let executionResult;
      
      if (skipExecution) {
        logger.info('\n⏭️  STEP 2: Skipping API execution (--skip-execute flag)');
        executionResult = this._getMockResponse(parsedRequest);
        result.steps.step2 = { success: true, skipped: true };
      } else {
        logger.info('\n🚀 STEP 2: Executing API call...');
        executionResult = await this.apiExecutor.executeApi({
          serviceName,
          helperClass: helperInfo.helperClass,
          methodName: helperInfo.methodName,
          payload: parsedRequest.body || {},
          parsedRequest
        });
        
        logger.info('✓ API executed successfully');
        logger.info(`  Status: ${executionResult.response.status}`);
        logger.info(`  Time: ${executionResult.response.time}ms`);
        logger.info(`  Body: ${JSON.stringify(executionResult.response.body).substring(0, 100)}...`);
        
        result.steps.step2 = { success: true, executionResult };
      }

      // ========================================================================
      // STEP 3: Generate OpenAPI Spec
      // ========================================================================
      logger.info('\n📝 STEP 3: Generating OpenAPI specification...');
      const openApiPath = await this.openApiGenerator.generate({
        serviceName,
        apiName,
        request: parsedRequest,
        response: executionResult.response
      });
      
      logger.info('✓ OpenAPI spec generated successfully');
      logger.info(`  Location: ${openApiPath}`);
      logger.info('  📌 This is now the SOURCE OF TRUTH for this API');
      
      result.steps.step3 = { success: true, openApiPath };
      result.artifacts.openApiSpec = openApiPath;

      // ========================================================================
      // STEP 4: Generate Test Code via LLM
      // ========================================================================
      logger.info('\n🤖 STEP 4: Generating test code via LLM...');
      const testCodePath = await this.testCodeGenerator.generate({
        serviceName,
        apiName,
        openApiSpecPath: openApiPath,
        helperInfo,
        llmProvider
      });
      
      logger.info('✓ Test code generated successfully');
      logger.info(`  Location: ${testCodePath}`);
      
      result.steps.step4 = { success: true, testCodePath };
      result.artifacts.testFile = testCodePath;

      // ========================================================================
      // Summary
      // ========================================================================
      logger.info('\n' + '='.repeat(80));
      logger.info('✅ TEST GENERATION COMPLETED SUCCESSFULLY');
      logger.info('='.repeat(80));
      logger.info('\n📊 Generated Artifacts:');
      logger.info(`  1. Helper Method: ${result.artifacts.helperFile}`);
      logger.info(`  2. OpenAPI Spec: ${result.artifacts.openApiSpec} (SOURCE OF TRUTH)`);
      logger.info(`  3. Test File: ${result.artifacts.testFile}`);
      logger.info('\n🎯 Next Steps:');
      logger.info(`  Run test: npx playwright test ${result.artifacts.testFile}`);
      logger.info('='.repeat(80));

      result.success = true;
      return result;

    } catch (error) {
      logger.error('\n❌ Generation failed:');
      logger.error(error.message);
      logger.error(error.stack);
      
      result.success = false;
      result.error = error.message;
      throw error;
    }
  }

  /**
   * Generate mock response for skip-execution mode
   * @private
   */
  _getMockResponse(parsedRequest) {
    return {
      request: parsedRequest,
      response: {
        status: 200,
        headers: {
          'content-type': 'application/json'
        },
        body: {
          success: true,
          message: 'Mock response (API not executed)'
        },
        time: 0
      }
    };
  }
}

module.exports = { Orchestrator };