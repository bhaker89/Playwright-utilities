#!/usr/bin/env node

const yargs = require('yargs');
const { TestRunner } = require('../core/test-runner');
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
      .command(
        'import <type> [file]',
        'Import tests from external formats (e.g. postman)',
        (yargs) => {
          return yargs
            .positional('type', {
              describe: 'Type of import',
              choices: ['postman', 'curl'],
              type: 'string',
            })
            .positional('file', {
              describe: 'Path to source file',
              type: 'string',
            })
            .option('output', {
              alias: 'o',
              describe: 'Output directory for generated tests',
              type: 'string',
            })
            .option('cmd', {
              describe: 'Raw CURL command string (if type is curl)',
              type: 'string',
            })
            .option('name', {
              describe: 'Test name (if type is curl)',
              type: 'string',
              default: 'Imported Test'
            });
        },
        async (argv) => {
          await this.importCommand(argv);
        }
      )
      .command(
        'generate <type> <prompt>',
        'Generate test from natural language prompt',
        (yargs) => {
          return yargs
            .positional('type', { choices: ['ui', 'api'] })
            .positional('prompt', { type: 'string' });
        },
        async (argv) => {
          await this.generateCommand(argv);
        }
      )
      .command(
        'generate-from-curl',
        'Generate API test from cURL command (complete flow)',
        (yargs) => {
          return yargs
            .option('curl', {
              alias: 'c',
              describe: 'cURL command string',
              type: 'string',
              demandOption: true
            })
            .option('service', {
              alias: 's',
              describe: 'Service name (e.g., payment-service)',
              type: 'string',
              demandOption: true
            })
            .option('api', {
              alias: 'a',
              describe: 'API name (e.g., process-payment)',
              type: 'string',
              demandOption: true
            })
            .option('skip-execute', {
              describe: 'Skip API execution (use mock response)',
              type: 'boolean',
              default: false
            })
            .option('llm-provider', {
              describe: 'LLM provider to use',
              choices: ['openai', 'claude', 'groq'],
              default: 'openai'
            });
        },
        async (argv) => {
          await this.generateFromCurlCommand(argv);
        }
      )
      .command(
        'generate-from-openapi',
        'Generate Playwright API tests directly from an OpenAPI spec file using an LLM',
        (yargs) => {
          return yargs
            .option('spec', {
              alias: 's',
              describe: 'Path to OpenAPI spec file (.yaml or .json)',
              type: 'string',
              demandOption: true
            })
            .option('service', {
              describe: 'Service name (e.g., payment-service)',
              type: 'string',
              demandOption: true
            })
            .option('api', {
              alias: 'a',
              describe: 'API/operation name (e.g., create-order)',
              type: 'string',
              demandOption: true
            })
            .option('llm-provider', {
              alias: 'l',
              describe: 'LLM provider to use',
              choices: ['openai', 'claude', 'groq'],
              default: 'groq'
            })
            .option('output', {
              alias: 'o',
              describe: 'Custom output directory for generated test file',
              type: 'string'
            });
        },
        async (argv) => {
          await this.generateFromOpenApiCommand(argv);
        }
      )
      .example('$0 generate ui "Login and verify dashboard"', 'Generate UI test')
      .example('$0 generate-from-curl --curl "curl -X POST..." --service payment-service --api process-payment', 'Generate from cURL')
      .example('$0 generate-from-openapi --spec services/order/openapi.yaml --service order-service --api create-order --llm-provider groq', 'Generate tests from OpenAPI spec using Groq')
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
    console.log('='.repeat(80));

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
      const { TestSuiteLoader } = require('../parsers/test-suite-loader');
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
   * Import command handler
   */
  async importCommand(argv) {
    const sourcePath = argv.file ? path.resolve(argv.file) : null;

    if (sourcePath && !fs.existsSync(sourcePath)) {
      console.error(`Error: Source file not found: ${sourcePath}`);
      process.exit(1);
    }

    console.log(`📦 Importing ${argv.type}...`);

    try {
      if (argv.type === 'postman') {
        if (!sourcePath) throw new Error('Postman collection file required.');
        const { PostmanParser } = require('../parsers/postman-parser');
        const parser = new PostmanParser();
        const suite = parser.parse(sourcePath);
        await this._saveImportedSuite(suite, argv.output);
      } else if (argv.type === 'curl') {
        const { CurlParser } = require('../parsers/curl-parser');
        const parser = new CurlParser();

        let curlCmd = '';
        if (argv.cmd) {
          curlCmd = argv.cmd;
        } else if (sourcePath && fs.existsSync(sourcePath)) {
          curlCmd = fs.readFileSync(sourcePath, 'utf8');
        }

        if (!curlCmd) throw new Error('CURL command not provided. Use --cmd or provide a file path.');

        const testCase = parser.parseCommand(curlCmd, argv.name);
        const suite = {
          name: argv.name,
          description: 'Imported from CURL',
          tests: [testCase]
        };
        await this._saveImportedSuite(suite, argv.output);
      }
      process.exit(0);
    } catch (error) {
      console.error('\n✗ Import failed:');
      console.error(error.message);
      if (argv.verbose) console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Internal helper to save suite to YAML
   */
  async _saveImportedSuite(suite, outputDirArg) {
    const outputDir = outputDirArg
      ? path.resolve(outputDirArg)
      : path.resolve(process.cwd(), 'no-code-tests/api');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const yaml = require('js-yaml');
    const fileName = `${suite.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.yaml`;
    const outputPath = path.join(outputDir, fileName);

    fs.writeFileSync(outputPath, yaml.dump(suite, { indent: 2, lineWidth: -1 }));
    console.log(`\n✓ Successfully converted to: ${outputPath}`);
    console.log(`  Tests generated: ${suite.tests.length}`);
    console.log(`  Run with: node platform/cli/index.js run ${path.relative(process.cwd(), outputPath)}`);
  }

  /**
   * Generate from cURL command handler (NEW FLOW)
   */
  async generateFromCurlCommand(argv) {
    console.log('🚀 API Test Generator - Complete Flow');
    console.log('='.repeat(80));

    try {
      const { Orchestrator } = require('../core/orchestrator');
      const orchestrator = new Orchestrator();

      const result = await orchestrator.generateFromCurl({
        curlCommand: argv.curl,
        serviceName: argv.service,
        apiName: argv.api,
        skipExecution: argv.skipExecute,
        llmProvider: argv.llmProvider
      });

      if (result.success) {
        console.log('\n✅ SUCCESS! All artifacts generated:');
        console.log(`  1. Helper: ${result.artifacts.helperFile}`);
        console.log(`  2. OpenAPI: ${result.artifacts.openApiSpec}`);
        console.log(`  3. Test: ${result.artifacts.testFile}`);
        console.log('\n🎯 Run your test:');
        console.log(`  npx playwright test ${result.artifacts.testFile}`);
        process.exit(0);
      } else {
        console.error('\n❌ Generation failed. Check logs for details.');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      if (argv.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Generate tests from OpenAPI spec command handler
   */
  async generateFromOpenApiCommand(argv) {
    console.log('🤖 OpenAPI → Playwright Test Generator (Powered by Groq)');
    console.log('='.repeat(80));

    const specPath = path.resolve(argv.spec);

    if (!fs.existsSync(specPath)) {
      console.error(`❌ OpenAPI spec file not found: ${specPath}`);
      process.exit(1);
    }

    const llmProvider = argv.llmProvider || process.env.AI_PROVIDER || 'groq';
    console.log(`  📄 Spec:     ${specPath}`);
    console.log(`  🔧 Service:  ${argv.service}`);
    console.log(`  📌 API:      ${argv.api}`);
    console.log(`  🧠 LLM:      ${llmProvider}`);
    console.log('');

    try {
      // Load env so GROQ_API_KEY is available
      require('../../config/environment.config');

      // Set the provider env var so LLMClient picks it up
      process.env.GROQ_API_KEY = process.env.GROQ_API_KEY ||
        require('dotenv').config({ path: require('path').resolve(__dirname, '../../config/.env.stag') }).parsed?.GROQ_API_KEY;

      const { OpenApiTestOrchestrator } = require('./openapi-test-orchestrator');
      const orchestrator = new OpenApiTestOrchestrator();

      const result = await orchestrator.generate({
        specPath,
        serviceName: argv.service,
        apiName: argv.api,
        llmProvider,
        outputDir: argv.output
      });

      if (result.success) {
        console.log('\n✅ SUCCESS! Test file generated:');
        console.log(`  📝 ${result.testFilePath}`);
        console.log(`\n🎯 Run your tests:`);
        console.log(`  npx playwright test ${result.testFilePath}`);
        process.exit(0);
      } else {
        console.error('\n❌ Generation failed. Check logs above for details.');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Generate test command handler
   */
  async generateCommand(argv) {
    console.log(`🧠 AI Generating ${argv.type} test for: "${argv.prompt}"...`);

    try {
      const aiEngine = require('../core/ai-engine');
      const testSuite = await aiEngine.generateTestFromPrompt(argv.prompt);

      if (!testSuite) {
        console.error('✗ AI could not generate a test for this prompt.');
        process.exit(1);
      }

      const outputDir = path.resolve(process.cwd(), 'no-code-tests/generated');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const fileName = `${testSuite.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.yaml`;
      const outputPath = path.join(outputDir, fileName);

      const yaml = require('js-yaml');
      fs.writeFileSync(outputPath, yaml.dump(testSuite, { indent: 2 }));

      console.log(`\n✨ Generated test saved to: ${outputPath}`);
      console.log('You can run it with:');
      console.log(`node platform/cli/index.js run ${path.relative(process.cwd(), outputPath)}`);

      process.exit(0);
    } catch (error) {
      console.error('\n✗ Generation failed:', error.message);
      process.exit(1);
    }
  }

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