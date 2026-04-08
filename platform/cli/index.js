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
      .option('workspace-root', {
        alias: 'w',
        describe: 'Workspace root (child repo root). Defaults to current directory.',
        type: 'string',
      })
      // PHASE 4 LOCK: Removed deprecated 'run' command
      // Legacy YAML execution is disabled. Use run-intent for TXT DSL pipeline.
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
      // PHASE 4 LOCK: Removed legacy 'generate' command
      // Use TXT DSL pipeline: generate-from-dsl → ground-spec → run-intent
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
      // PHASE 4 LOCK: Removed 'generate-spec' command
      // Direct Playwright spec generation is deprecated. Use intent spec pipeline.
      .command(
        'run-intent <specPath>',
        'Execute intent spec via registry-backed pipeline (ONLY valid entry)',
        (yargs) => {
          return yargs
            .positional('specPath', {
              describe: 'Path to intent spec YAML file',
              type: 'string',
            })
            .option('service', {
              alias: 's',
              describe: 'Service name override',
              type: 'string',
            })
            .option('headless', {
              describe: 'Run in headless mode',
              type: 'boolean',
              default: true,
            });
        },
        async (argv) => {
          await this.runIntentCommand(argv);
        }
      )
      .command(
        'doctor',
        'Validate execution environment and configuration',
        (yargs) => yargs,
        async (argv) => {
          await this.doctorCommand(argv);
        }
      )
      .command(
        'validate-flow <dslFile>',
        'Validate TXT DSL syntax without execution',
        (yargs) => {
          return yargs.positional('dslFile', {
            describe: 'Path to TXT DSL file',
            type: 'string',
          });
        },
        async (argv) => {
          await this.validateFlowCommand(argv);
        }
      )
      .command(
        'preview-flow <dslFile>',
        'Preview normalized intent from TXT DSL',
        (yargs) => {
          return yargs.positional('dslFile', {
            describe: 'Path to TXT DSL file',
            type: 'string',
          });
        },
        async (argv) => {
          await this.previewFlowCommand(argv);
        }
      )
      .example('$0 run-intent specs/login-flow.intent.yaml --service psp', 'Run intent spec')
      .example('$0 doctor', 'Check environment health')
      .example('$0 validate-flow flows/login.txt', 'Validate DSL syntax')
      .example('$0 preview-flow flows/login.txt', 'Preview normalized intent')
      .demandCommand(1, 'You must provide a command')
      .help('h')
      .alias('h', 'help')
      .version('1.0.0')
      .alias('v', 'version')
      .argv;
  }

  /**
   * Run intent spec command (LOCKED ENTRYPOINT)
   */
  async runIntentCommand(argv) {
    if (argv.workspaceRoot) {
      process.env.AUTOMATION_ROOT = path.resolve(argv.workspaceRoot);
    }

    const specPath = path.resolve(argv.specPath);

    if (!fs.existsSync(specPath)) {
      console.error(`Error: Intent spec file not found: ${specPath}`);
      process.exit(1);
    }

    console.log('🚀 Intent Runner - Locked Execution Pipeline');
    console.log('='.repeat(80));

    try {
      const { runIntentSpec } = require('../core/intent-runner');
      await runIntentSpec({
        specPath,
        service: argv.service,
        headless: argv.headless,
      });
      console.log('\n✓ Intent execution completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('\n✗ Intent execution failed:');
      console.error(error.message);
      if (argv.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Doctor command - Environment validation
   */
  async doctorCommand(argv) {
    console.log('🏥 Running environment diagnostics...\n');
    
    try {
      const { runDoctor } = require('../cli/doctor');
      await runDoctor();
      process.exit(0);
    } catch (error) {
      console.error('✗ Doctor command failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validate DSL flow command
   */
  async validateFlowCommand(argv) {
    const dslPath = path.resolve(argv.dslFile);

    if (!fs.existsSync(dslPath)) {
      console.error(`Error: DSL file not found: ${dslPath}`);
      process.exit(1);
    }

    console.log('🔍 Validating TXT DSL flow...');

    try {
      const { DSLNormalizer } = require('../core/dsl-normalizer');
      const normalizer = new DSLNormalizer();
      const fs = require('fs');
      const dslContent = fs.readFileSync(dslPath, 'utf8');
      
      const result = normalizer.normalize(dslContent);
      
      console.log('✓ DSL syntax is valid!');
      console.log(`  Actions: ${result.actions.length}`);
      console.log(`  Flow: ${dslPath}`);
      process.exit(0);
    } catch (error) {
      console.error('✗ Validation failed:');
      console.error(error.message);
      process.exit(1);
    }
  }

  /**
   * Preview DSL flow command
   */
  async previewFlowCommand(argv) {
    const dslPath = path.resolve(argv.dslFile);

    if (!fs.existsSync(dslPath)) {
      console.error(`Error: DSL file not found: ${dslPath}`);
      process.exit(1);
    }

    console.log('👁️  Previewing normalized intent from DSL...\n');

    try {
      const { DSLNormalizer } = require('../core/dsl-normalizer');
      const normalizer = new DSLNormalizer();
      const fs = require('fs');
      const dslContent = fs.readFileSync(dslPath, 'utf8');
      
      const result = normalizer.normalize(dslContent);
      
      console.log('Normalized Actions:');
      console.log('='.repeat(80));
      result.actions.forEach((action, idx) => {
        console.log(`${idx + 1}. ${action.canonical} ${action.target ? `-> ${action.target}` : ''} ${action.value ? `(${action.value})` : ''}`);
      });
      console.log('='.repeat(80));
      
      process.exit(0);
    } catch (error) {
      console.error('✗ Preview failed:');
      console.error(error.message);
      process.exit(1);
    }
  }

  /**
   * Run test suite command (DEPRECATED - LEGACY)
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
    if (argv.workspaceRoot) {
      process.env.AUTOMATION_ROOT = path.resolve(argv.workspaceRoot);
    }

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
    if (argv.workspaceRoot) {
      process.env.AUTOMATION_ROOT = path.resolve(argv.workspaceRoot);
    }

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
      : path.resolve(process.env.AUTOMATION_ROOT || process.cwd(), 'no-code-tests/api');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const yaml = require('js-yaml');
    const fileName = `${suite.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.yaml`;
    const outputPath = path.join(outputDir, fileName);

    fs.writeFileSync(outputPath, yaml.dump(suite, { indent: 2, lineWidth: -1 }));
    console.log(`\n✓ Successfully converted to: ${outputPath}`);
    console.log(`  Tests generated: ${suite.tests.length}`);
    console.log(`  Run with: node platform/cli/index.js run ${path.relative(process.env.AUTOMATION_ROOT || process.cwd(), outputPath)}`);
  }

  /**
   * Generate from cURL command handler (NEW FLOW)
   */
  async generateFromCurlCommand(argv) {
    if (argv.workspaceRoot) {
      process.env.AUTOMATION_ROOT = path.resolve(argv.workspaceRoot);
    }

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
    if (argv.workspaceRoot) {
      process.env.AUTOMATION_ROOT = path.resolve(argv.workspaceRoot);
    }

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
   * Generate no-code YAML spec from prompt
   */
  async generateSpecCommand(argv) {
    if (argv.workspaceRoot) {
      process.env.AUTOMATION_ROOT = path.resolve(argv.workspaceRoot);
    }

    console.log(`\n\ud83e\udde0 Generating YAML spec from prompt: "${argv.prompt}"`);

    try {
      const { generateSpecFromPrompt } = require('../generators/prompt-to-spec-generator');

      const result = await generateSpecFromPrompt(
        argv.prompt,
        argv.service,
        argv.out || null,
        { llmProvider: argv.llmProvider }
      );

      console.log(`\n\u2705 Spec generated: ${result.outputPath}`);
      console.log(`\n\ud83c\udfaf Run it with:`);
      const specPathForRunCommand = argv.out || path.relative(process.env.AUTOMATION_ROOT || process.cwd(), result.outputPath);
      console.log(`  npx automation-core --spec ${specPathForRunCommand} --service ${argv.service}`);
      process.exit(0);
    } catch (error) {
      console.error('\n\u274c Spec generation failed:');
      console.error(error.message);
      process.exit(1);
    }
  }

  /**
   * Generate test command handler
   */
  async generateCommand(argv) {
    if (argv.workspaceRoot) {
      process.env.AUTOMATION_ROOT = path.resolve(argv.workspaceRoot);
    }

    console.log(`🧠 AI Generating ${argv.type} test for: "${argv.prompt}"...`);

    try {
      const aiEngine = require('../core/ai-engine');
      const testSuite = await aiEngine.generateTestFromPrompt(argv.prompt);

      if (!testSuite) {
        console.error('✗ AI could not generate a test for this prompt.');
        process.exit(1);
      }

      const outputDir = path.resolve(process.env.AUTOMATION_ROOT || process.cwd(), 'no-code-tests/generated');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const fileName = `${testSuite.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.yaml`;
      const outputPath = path.join(outputDir, fileName);

      const yaml = require('js-yaml');
      fs.writeFileSync(outputPath, yaml.dump(testSuite, { indent: 2 }));

      console.log(`\n✨ Generated test saved to: ${outputPath}`);
      console.log('You can run it with:');
      console.log(`node platform/cli/index.js run ${path.relative(process.env.AUTOMATION_ROOT || process.cwd(), outputPath)}`);

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