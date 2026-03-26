// Main entry point for the no-code API test framework

const { TestRunner } = require('./runner/test-runner');
const { TestSuiteLoader } = require('./parsers/test-suite-loader');
const { CurlParser } = require('./parsers/curl-parser');
const { AssertionEngine } = require('./engine/assertion-engine');
const { VariableManager } = require('./engine/variable-manager');
const { RequestModifier } = require('./engine/request-modifier');
const { DataProvider } = require('./engine/data-provider');

/**
 * Public API exports for the no-code test framework
 */
module.exports = {
  // Main test runner
  TestRunner,

  // Parsers
  TestSuiteLoader,
  CurlParser,

  // Engine components
  AssertionEngine,
  VariableManager,
  RequestModifier,
  DataProvider,
};