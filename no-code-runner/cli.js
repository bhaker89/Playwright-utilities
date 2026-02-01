#!/usr/bin/env node

const yargs = require('yargs');
const { TestRunner } = require('./runner/test-runner');
const path = require('path');
const fs = require('fs');

/**
 * CLI for No-Code API Test Runner
 */
class CLI {
  constructor() {
    this.testRunner = new TestRunner();
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    return yargs(process.argv.slice(2))
      .usage('Usage: $0 <command> [options]')
      .command(
        'run <testFile>',
        'Run a test suite from YAML/JSON file',
        (yargs) => {
          return yargs
            .positional('testFile', {
              describe: 'Path to test suite file (YAML or JSON)',
              type: 'string',
            })
            .option('verbose', {
              alias: 'v',
              describe: 'Enable verbose output',
              type: 'boolean',
              default: false,
            });
        },
        async (argv) => {
          await this.runCommand(argv);
        }
      )
      .command(
        'validate <testFile>',
        'Validate test suite file without running tests',
        (yargs) => {
          return yargs.positional('testFile', {
            describe: 'Path to test suite file (YAML or JSON)',
            type: 'string',
          });
        },
        async (argv) => {
          await this.validateCommand(argv);
        }
      )
      .example('$0 run tests/api-tests.yaml', 'Run tests from YAML file')
      .example('$0 run tests/api-tests.json', 'Run tests from JSON file')
      .example('$0 validate tests/api-tests.yaml', 'Validate test file')
      .demandCommand(1, 'You must provide a command')
      .help('h')
      .alias('h', 'help')
      .version('1.0.0')
      .alias('v', 'version')
      .argv;
  }

  /**
   * Run test suite command
   */
  async runCommand(argv) {
    const testFilePath = path.resolve(argv.testFile);

    // Check if file exists
    if (!fs.existsSync(testFilePath)) {
      console.error(`Error: Test file not found: ${testFilePath}`);
      process.exit(1);
    }

    console.log('🚀 No-Code API Test Runner');
    console.log('=' .repeat(80));

    try {
      await this.testRunner.runTestSuite(testFilePath);
      console.log('\n✓ All tests completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('\n✗ Test execution failed:');
      console.error(error.message);
      if (argv.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Validate test suite command
   */
  async validateCommand(argv) {
    const testFilePath = path.resolve(argv.testFile);

    // Check if file exists
    if (!fs.existsSync(testFilePath)) {
      console.error(`Error: Test file not found: ${testFilePath}`);
      process.exit(1);
    }

    console.log('🔍 Validating test suite...');

    try {
      const { TestSuiteLoader } = require('./parsers/test-suite-loader');
      const loader = new TestSuiteLoader();
      const testSuite = await loader.load(testFilePath);

      console.log('✓ Test suite is valid!');
      console.log(`  Name: ${testSuite.name}`);
      console.log(`  Tests: ${testSuite.tests.length}`);
      console.log(`  Base URL: ${testSuite.config?.base_url || 'N/A'}`);

      process.exit(0);
    } catch (error) {
      console.error('✗ Validation failed:');
      console.error(error.message);
      process.exit(1);
    }
  }

  /**
   * Run CLI
   */
  async run() {
    await this.parseArgs();
  }
}

// Main execution
if (require.main === module) {
  const cli = new CLI();
  cli.run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { CLI };