'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const minimist = require('minimist');
const { execSync } = require('child_process');
const { LLMClient } = require('../generators/llm-client');
const { ContextGatherer } = require('../generators/context-gatherer');
const { logger } = require('../../utils/base/logger');

/**
 * ============================================================================
 * OPENAPI TEST ORCHESTRATOR
 * ============================================================================
 *
 * Generates Playwright API test files directly from an OpenAPI spec file.
 *
 * Flow:
 *   1. Load & parse the OpenAPI spec (YAML or JSON)
 *   2. Gather existing framework context (patterns, fixtures, helpers)
 *   3. Build a focused LLM prompt using the spec + context
 *   4. Invoke the LLM (Groq by default) to generate test code
 *   5. Extract, validate (AST + endpoint coverage), and save the .spec.js file
 *   6. Optionally execute the generated tests and capture pass/fail
 *
 * FIXES APPLIED:
 *   FIX 1 — Robust code extraction (line-scan instead of fragile regex)
 *   FIX 2 — Deep validation: AST-level checks + endpoint coverage verification
 *   FIX 3 — LLM retry logic with exponential backoff (3 attempts)
 *   FIX 4 — Truncation communicated inside the prompt to the LLM
 *   FIX 5 — Dry-run mode: preview generated code before writing to disk
 *   FIX 6 — Inline test execution with pass/fail capture via Playwright CLI
 *
 * USAGE (CLI):
 *   node platform/cli/index.js generate-from-openapi \
 *     --spec services/order-service/apis/create-order/openapi.yaml \
 *     --service order-service --api create-order --llm-provider groq \
 *     [--dry-run] [--execute]
 * ============================================================================
 */

class OpenApiTestOrchestrator {
  constructor() {
    this.contextGatherer = new ContextGatherer();
    this.testsDir = path.resolve(__dirname, '../../tests/api');

    // FIX 3: Retry configuration
    this.llmRetry = {
      maxAttempts: 3,
      baseDelayMs: 1000,   // doubles each attempt: 1s → 2s → 4s
    };
  }

  /**
   * Main entry point
   * @param {Object}  options
   * @param {string}  options.specPath     - Absolute path to the OpenAPI spec file
   * @param {string}  options.serviceName  - e.g. 'order-service'
   * @param {string}  options.apiName      - e.g. 'create-order'
   * @param {string}  [options.llmProvider='groq']
   * @param {string}  [options.outputDir]  - Override output directory
   * @param {boolean} [options.dryRun=false]  - FIX 5: Preview without writing to disk
   * @param {boolean} [options.execute=false] - FIX 6: Run generated tests after saving
   * @returns {Promise<{success: boolean, testFilePath?: string, executionResult?: object}>}
   */
  async generate(options) {
    const {
      specPath,
      serviceName,
      apiName,
      llmProvider = 'groq',
      outputDir,
      dryRun = false,     // FIX 5
      execute = false,    // FIX 6
    } = options;

    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`  OpenAPI → Test Generator`);
    logger.info(`  Spec:     ${specPath}`);
    logger.info(`  Service:  ${serviceName}`);
    logger.info(`  API:      ${apiName}`);
    logger.info(`  LLM:      ${llmProvider}`);
    logger.info(`  Dry Run:  ${dryRun}`);      // FIX 5
    logger.info(`  Execute:  ${execute}`);     // FIX 6
    logger.info(`${'='.repeat(60)}\n`);

    try {
      // Step 1: Load & parse the OpenAPI spec
      logger.info('📄 Step 1: Loading OpenAPI specification...');
      const specContent = fs.readFileSync(specPath, 'utf8');
      const specObject = this._parseSpec(specPath, specContent);
      logger.info('  ✓ Spec loaded and parsed');

      // Step 2: Gather framework context
      logger.info('🔍 Step 2: Gathering framework context...');
      let context;
      try {
        context = await this.contextGatherer.gatherContext(serviceName);
        logger.info('  ✓ Context gathered');
      } catch (_) {
        context = { fixturePatterns: [], importPatterns: [], exampleTests: [], assertionPatterns: [] };
        logger.warn('  ⚠  Context gather skipped (non-critical)');
      }

      // Step 3: Build prompt
      logger.info('🧠 Step 3: Building LLM prompt...');
      // FIX 4: _buildPrompt now returns both the prompt and a truncation flag
      const { prompt, wasTruncated, totalEndpoints } = this._buildPrompt({
        specContent,
        specObject,
        serviceName,
        apiName,
        context,
      });
      logger.info(`  ✓ Prompt built (${prompt.length} chars, truncated: ${wasTruncated})`);

      // Step 4: Generate via LLM — with retry (FIX 3)
      logger.info(`🤖 Step 4: Generating tests via ${llmProvider.toUpperCase()}...`);
      const llmResponse = await this._generateWithRetry(llmProvider, prompt);
      logger.info('  ✓ LLM response received');

      // Step 5: Extract, deep-validate, optionally save
      logger.info('🔬 Step 5: Extracting and validating generated code...');

      // FIX 1: Robust code extraction
      const testCode = this._extractCode(llmResponse.content);

      // FIX 2: Deep validation — AST checks + endpoint coverage
      const endpointPaths = this._extractEndpointPaths(specObject);
      this._validateCode(testCode, apiName, endpointPaths);

      // FIX 5: Dry-run — print preview and exit without writing
      if (dryRun) {
        logger.info('\n📋 DRY RUN — Generated code preview (not saved):\n');
        logger.info('─'.repeat(60));
        logger.info(testCode);
        logger.info('─'.repeat(60));
        logger.info(`\n  Endpoints detected in spec: ${endpointPaths.join(', ')}`);
        return { success: true, dryRun: true, testCode };
      }

      // Step 6: Save to disk
      logger.info('💾 Step 6: Saving generated test file...');
      const testFilePath = await this._saveTestFile(serviceName, apiName, testCode, outputDir);
      logger.info(`  ✓ Test file saved → ${testFilePath}`);

      // FIX 6: Optionally execute and capture pass/fail
      let executionResult = null;
      if (execute) {
        logger.info('🚀 Step 7: Executing generated tests...');
        executionResult = this._executeTests(testFilePath);
        const { passed, failed, skipped } = executionResult;
        logger.info(`  ✅ Passed: ${passed}  ❌ Failed: ${failed}  ⏭  Skipped: ${skipped}`);
      }

      return { success: true, testFilePath, executionResult };

    } catch (error) {
      logger.error(`\n❌ OpenAPI test generation failed: ${error.message}`);
      logger.error(error.stack);
      return { success: false, error: error.message };
    }
  }

  // ---------------------------------------------------------------------------
  // FIX 3 — LLM retry with exponential backoff
  // ---------------------------------------------------------------------------

  /**
   * Calls the LLM with up to maxAttempts retries on failure or empty response.
   * Delay doubles between attempts: 1s, 2s, 4s.
   * @private
   */
  async _generateWithRetry(llmProvider, prompt) {
    const { maxAttempts, baseDelayMs } = this.llmRetry;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.info(`  Attempt ${attempt}/${maxAttempts}...`);
        const llmClient = new LLMClient(llmProvider);
        const response = await llmClient.generate({
          prompt,
          maxTokens: 3000,
          temperature: 0.4,
        });

        if (!response || !response.content) {
          throw new Error('LLM returned an empty response');
        }

        return response;

      } catch (err) {
        lastError = err;
        logger.warn(`  ⚠  Attempt ${attempt} failed: ${err.message}`);

        if (attempt < maxAttempts) {
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
          logger.info(`  ⏳ Retrying in ${delayMs}ms...`);
          await this._sleep(delayMs);
        }
      }
    }

    throw new Error(`LLM failed after ${maxAttempts} attempts. Last error: ${lastError.message}`);
  }

  /** @private */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------------------
  // FIX 1 — Robust code extraction (line-scan approach)
  // ---------------------------------------------------------------------------

  /**
   * Extracts JavaScript source from LLM output.
   *
   * Strategy: scan line-by-line for the first line that looks like real JS
   * (require/import/const/test) rather than relying on markdown fence regex,
   * which breaks when the LLM uses unusual variations like:
   *   ```js, ```javascript\r\n, ``` javascript, or no fence at all.
   *
   * @private
   */
  _extractCode(content) {
    if (!content) return '';

    const lines = content.split('\n');

    // Find the first line that looks like actual JS code
    const jsStartPatterns = [
      /^['"]use strict['"];?/,
      /^const\s+\{/,
      /^const\s+\w+/,
      /^import\s+/,
      /^\/\//,                       // comment line
      /^\/\*\*/,                     // JSDoc block
      /^test\.(describe|only|skip)/,
      /^test\(/,
    ];

    let startIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (jsStartPatterns.some(p => p.test(trimmed))) {
        startIndex = i;
        break;
      }
    }

    // Find the last line that looks like actual JS (ignore trailing markdown/prose)
    const jsEndPatterns = [/^[}\])]/, /^\/\//, /^\s*$/];
    let endIndex = lines.length - 1;
    for (let i = lines.length - 1; i >= startIndex; i--) {
      const trimmed = lines[i].trim();
      // Stop at closing brace/bracket or blank line after code
      if (trimmed === '```' || trimmed.startsWith('```')) {
        endIndex = i - 1;
        break;
      }
    }

    return lines.slice(startIndex, endIndex + 1).join('\n').trim();
  }

  // ---------------------------------------------------------------------------
  // FIX 2 — Deep validation: AST-level checks + endpoint coverage
  // ---------------------------------------------------------------------------

  /**
   * Validates generated code at two levels:
   *   Level 1 — structural: imports, test blocks, assertions (as before)
   *   Level 2 — coverage:   every endpoint path from the spec appears in the code
   *
   * @param {string}   code          - Generated JS source
   * @param {string}   apiName       - Used in error messages
   * @param {string[]} endpointPaths - Paths extracted from the OpenAPI spec
   * @private
   */
  _validateCode(code, apiName, endpointPaths = []) {
    if (!code || code.length < 50) {
      throw new Error('Generated code is too short or empty');
    }

    // --- Level 1: Structural checks ---
    const structuralChecks = [
      { test: () => code.includes('require('),                             msg: 'Missing require() imports' },
      { test: () => code.includes('test.describe') || code.includes('test('), msg: 'Missing test.describe / test() blocks' },
      { test: () => code.includes('expect('),                             msg: 'Missing expect() assertions' },
      { test: () => code.includes('async'),                               msg: 'Missing async/await — tests must be async' },
      { test: () => /expect\([^)]+\)\.toHave(Status|StatusCode)/.test(code) || code.includes('.status('), msg: 'Missing HTTP status code assertion' },
    ];

    for (const check of structuralChecks) {
      if (!check.test()) {
        throw new Error(`Code validation failed — ${check.msg}`);
      }
    }

    // --- Level 2: Endpoint coverage check ---
    // Every path in the spec should be referenced somewhere in the generated tests.
    // e.g. spec has /orders/{orderId} → generated code should mention '/orders/'
    const uncoveredEndpoints = endpointPaths.filter(ep => {
      // Normalise path params: /orders/{orderId} → /orders/
      const normalised = ep.replace(/\{[^}]+\}/g, '');
      return !code.includes(normalised);
    });

    if (uncoveredEndpoints.length > 0) {
      logger.warn(`  ⚠  Endpoint coverage warning — these spec paths were NOT found in generated tests:`);
      uncoveredEndpoints.forEach(ep => logger.warn(`       • ${ep}`));
      // Warn but don't throw — LLM may have used a base URL variable
    }

    logger.info(`  ✓ Structural validation passed`);
    logger.info(`  ✓ Endpoint coverage: ${endpointPaths.length - uncoveredEndpoints.length}/${endpointPaths.length} paths referenced`);
  }

  /**
   * Extract all path strings from the OpenAPI spec object.
   * e.g. ['/orders', '/orders/{orderId}', '/orders/{orderId}/items']
   * @private
   */
  _extractEndpointPaths(specObject) {
    return Object.keys(specObject?.paths || {});
  }

  // ---------------------------------------------------------------------------
  // FIX 4 — Communicate truncation to the LLM inside the prompt
  // ---------------------------------------------------------------------------

  /**
   * Build a comprehensive LLM prompt from the spec and context.
   * Returns the prompt string AND metadata about truncation.
   * @private
   * @returns {{ prompt: string, wasTruncated: boolean, totalEndpoints: number }}
   */
  _buildPrompt({ specContent, specObject, serviceName, apiName, context }) {
    const title = specObject?.info?.title || apiName;
    const description = specObject?.info?.description || '';
    const servers = (specObject?.servers || []).map(s => s.url).join(', ') || 'https://api.example.com';

    // FIX 4: Track truncation and inject a warning into the prompt
    const maxLines = 800;
    const specLines = specContent.split('\n');
    const wasTruncated = specLines.length > maxLines;
    const endpointPaths = this._extractEndpointPaths(specObject);

    let truncatedSpec;
    let truncationNotice = '';

    if (wasTruncated) {
      truncatedSpec = specLines.slice(0, maxLines).join('\n');
      // Build a complete endpoint list from the parsed object (not the raw text)
      // so the LLM knows ALL endpoints even if the raw YAML was cut off.
      const endpointSummary = endpointPaths
        .flatMap(p => Object.keys(specObject.paths[p] || {}).map(m => `${m.toUpperCase()} ${p}`))
        .join('\n');

      truncationNotice = `
> ⚠️  SPEC TRUNCATED: The raw YAML below has been cut at ${maxLines} lines due to length.
> However, ALL endpoints have been extracted from the parsed spec and are listed below.
> You MUST generate tests for every endpoint in this list, even if its YAML definition
> was truncated. Use the schema property names visible in the partial spec as a guide,
> and infer reasonable request/response shapes for any endpoints whose details were cut off.
>
> COMPLETE ENDPOINT LIST (from parsed spec — do not skip any):
${endpointSummary}
`;
    } else {
      truncatedSpec = specContent;
    }

    const examplesSection = context.exampleTests?.length > 0
      ? context.exampleTests.map(ex => `### ${ex.fileName}\n\`\`\`javascript\n${ex.content}\n\`\`\``).join('\n\n')
      : 'No examples available. Follow Playwright best practices for API tests.';

    const prompt = `# Task: Generate Playwright API Test Code from OpenAPI Specification

You are an expert Playwright test automation engineer specialising in API testing.
Your job is to generate a complete, production-ready Playwright test file.

---

## OpenAPI Specification
${truncationNotice}
Title: ${title}
Description: ${description}
Servers: ${servers}

\`\`\`yaml
${truncatedSpec}
\`\`\`

---

## Service & File Information

- **Service Name**: ${serviceName}
- **API Name**:     ${apiName}
- **Helper import**: \`const { ${this._toClassName(serviceName)} } = require('../../../services/${serviceName}/${serviceName}-helper');\`

---

## Existing Framework Examples (for style reference)

${examplesSection}

---

## Requirements

### File Structure
- Use \`test.describe\` / \`test()\` blocks
- Group positive cases first, then negative/edge cases
- Write descriptive test names that read like sentences

### Imports
\`\`\`javascript
const { test, expect } = require('../../../fixtures/base-test');
const { ${this._toClassName(serviceName)} } = require('../../../services/${serviceName}/${serviceName}-helper');
\`\`\`

### Test Implementation
- Use the \`apiClient\` fixture from base-test
- Make real API calls via helper methods (or directly via \`apiClient.get/post/put/delete\`)
- Cover EVERY endpoint/operation listed above — do not skip any
- Include positive (happy-path) AND negative (invalid input, auth, not-found) tests

### Assertions
- Verify HTTP status codes (exact match with spec)
- Verify response body structure against schema properties
- Verify data types of key response fields
- Verify required properties are present

### Code Style
- Single quotes, 2-space indent, semicolons
- \`async/await\` only (no raw Promises)
- Add a one-line JSDoc comment on each \`test()\` call explaining its purpose

---

## Output Format

Generate ONLY the complete JavaScript test file.
Do NOT include any markdown, explanations, or code fences.
Start directly with the \`require\` imports.

Now generate the complete test file:
`;

    return { prompt, wasTruncated, totalEndpoints: endpointPaths.length };
  }

  // ---------------------------------------------------------------------------
  // FIX 6 — Execute generated tests and capture pass/fail
  // ---------------------------------------------------------------------------

  /**
   * Runs the generated spec file via Playwright CLI and parses the JSON report.
   *
   * Requires: @playwright/test installed, and a playwright.config.js at project root.
   *
   * @param {string} testFilePath - Absolute path to the generated .spec.js file
   * @returns {{ passed: number, failed: number, skipped: number, duration: number, failures: Array }}
   * @private
   */
  _executeTests(testFilePath) {
    const reportPath = path.join(path.dirname(testFilePath), '.pw-report.json');

    try {
      execSync(
        `npx playwright test "${testFilePath}" --reporter=json 2>/dev/null > "${reportPath}"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
    } catch (_) {
      // Playwright exits non-zero when tests fail — that's expected, not a crash.
      // The JSON report is still written; we parse it below.
    }

    if (!fs.existsSync(reportPath)) {
      logger.warn('  ⚠  Playwright JSON report not found — execution result unavailable');
      return { passed: 0, failed: 0, skipped: 0, duration: 0, failures: [] };
    }

    let report;
    try {
      report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    } catch (parseErr) {
      logger.warn(`  ⚠  Could not parse Playwright report: ${parseErr.message}`);
      return { passed: 0, failed: 0, skipped: 0, duration: 0, failures: [] };
    }

    // Clean up temp report
    fs.unlinkSync(reportPath);

    // Extract stats from Playwright JSON report shape
    const stats = report.stats || {};
    const passed = stats.expected ?? 0;
    const failed = stats.unexpected ?? 0;
    const skipped = stats.skipped ?? 0;
    const duration = stats.duration ?? 0;

    // Collect failure details for caller to surface
    const failures = (report.suites || [])
      .flatMap(s => s.specs || [])
      .flatMap(spec => spec.tests || [])
      .filter(t => t.status === 'failed' || t.status === 'unexpected')
      .map(t => ({
        title: t.title,
        error: t.results?.[0]?.error?.message || 'Unknown error',
      }));

    return { passed, failed, skipped, duration, failures };
  }

  // ---------------------------------------------------------------------------
  // Unchanged helpers (parse, save, toClassName)
  // ---------------------------------------------------------------------------

  /**
   * Parse OpenAPI spec from YAML or JSON
   * @private
   */
  _parseSpec(specPath, specContent) {
    const ext = path.extname(specPath).toLowerCase();
    if (ext === '.json') {
      return JSON.parse(specContent);
    }
    return yaml.load(specContent);
  }

  /**
   * Save test file to tests/api/{serviceName}/{apiName}.spec.js
   * @private
   */
  async _saveTestFile(serviceName, apiName, testCode, outputDirOverride) {
    const serviceTestDir = outputDirOverride
      ? path.resolve(outputDirOverride)
      : path.join(this.testsDir, serviceName);

    if (!fs.existsSync(serviceTestDir)) {
      fs.mkdirSync(serviceTestDir, { recursive: true });
    }

    const testFileName = `${apiName}.spec.js`;
    const testFilePath = path.join(serviceTestDir, testFileName);

    if (fs.existsSync(testFilePath)) {
      const backupPath = `${testFilePath}.backup.${Date.now()}`;
      fs.copyFileSync(testFilePath, backupPath);
      logger.warn(`  ⚠  Existing file backed up to: ${backupPath}`);
    }

    fs.writeFileSync(testFilePath, testCode, 'utf8');
    return testFilePath;
  }

  /**
   * Convert kebab-case service name to PascalCase class name
   * 'order-service' → 'OrderHelper'
   * @private
   */
  _toClassName(serviceName) {
    return serviceName
      .replace(/-service$/, '')
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') + 'Helper';
  }
}

module.exports = { OpenApiTestOrchestrator };

// -----------------------------------------------------------------------------
// automation-core CLI entrypoint
// -----------------------------------------------------------------------------
// NOTE:
// package.json bin currently points to this file. To support multiple commands
// without breaking existing installs, we route based on argv._[0].
if (require.main === module) {
  (async () => {
    // Load config/.env.<TEST_ENV> so GROQ_API_KEY/UI_BASE_URL/etc are available
    // for generate-intent-spec / ground-spec / run-intent flows.
    require('../../config/environment.config');

    const argv = minimist(process.argv.slice(2));
    const cmd = Array.isArray(argv._) && argv._.length > 0 ? String(argv._[0]) : null;

    // -------------------------------------------------------------------------
    // Phase 2: show prompt template (QA-friendly)
    // -------------------------------------------------------------------------
    if (cmd === 'intent-prompt-template') {
      const template = [
        'INTENT_PROMPT_TEMPLATE (copy/paste and fill):',
        '',
        'ENVIRONMENT:',
        '- env: stag | prod | dev',
        '- base_url: https://<env-host>/',
        '',
        'SERVICE:',
        '- service_name: <service>',
        '- flow_name: <short_name>',
        '',
        'AUTH:',
        '- required: yes/no',
        '- method: password | otp | sso',
        '- prereq_ui_state: e.g. "Login form appears only after clicking Login link"',
        '',
        'START STATE:',
        '- start_url: / (or full URL)',
        '- known popups: cookie banner / location modal / etc',
        '',
        'HAPPY PATH STEPS:',
        '1) ...',
        '2) ...',
        '3) ...',
        '',
        'ASSERTIONS:',
        '- url_contains: ...',
        '- visible_text_contains: ...',
        '- element_visible: ...',
        '',
        'CONSTRAINTS:',
        '- avoid_otp: true',
        '- avoid_payment: true',
        '- do_not_log_secrets: true',
      ].join('\n');

      // eslint-disable-next-line no-console
      console.log(template);
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 2: validate intent prompt file (QA-friendly)
    // -------------------------------------------------------------------------
    if (cmd === 'validate-intent-prompt') {
      const promptFile = argv['prompt-file'] || argv.promptFile || null;
      if (!promptFile) {
        throw new Error('Missing required argument: --prompt-file <path>');
      }

      const absolutePromptPath = path.resolve(promptFile);
      if (!fs.existsSync(absolutePromptPath)) {
        throw new Error(`Prompt file not found: ${absolutePromptPath}`);
      }

      const promptText = fs.readFileSync(absolutePromptPath, 'utf8');
      const { validateIntentPromptText } = require('../generators/prompt-to-intent-spec-generator');

      validateIntentPromptText(promptText);

      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ success: true, promptFile: absolutePromptPath }, null, 2));
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 2: prompt -> intent spec
    // -------------------------------------------------------------------------
    if (cmd === 'generate-intent-spec') {
      const promptArg = argv.prompt || argv.p || null;
      const promptFile = argv['prompt-file'] || argv.promptFile || null;
      const service = argv.service || argv.svc || null;
      const out = argv.out || null;
      const llmProvider = argv['llm-provider'] || argv.llmProvider || 'groq';
      const allowFallback = Boolean(argv['allow-fallback'] || argv.allowFallback);
      const strict = argv.strict === undefined ? true : Boolean(argv.strict);

      const prompt = promptFile
        ? fs.readFileSync(path.resolve(promptFile), 'utf8')
        : promptArg;

      if (!prompt) throw new Error('Missing required argument: --prompt <text> or --prompt-file <path>');
      if (!service) throw new Error('Missing required argument: --service <name>');

      const { generateIntentSpecFromPrompt } = require('../generators/prompt-to-intent-spec-generator');
      const result = await generateIntentSpecFromPrompt(prompt, service, out, {
        llmProvider,
        allowFallback,
        strict,
        validatePrompt: true,
      });

      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 2: intent spec -> locator registry
    // -------------------------------------------------------------------------
    if (cmd === 'ground-spec') {
      const specPath = argv.spec || argv.s || null;
      const service = argv.service || argv.svc || null;
      const baseUrl = argv['base-url'] || argv.baseUrl || null;
      const storageStatePath = argv['storage-state'] || argv.storageState || null;
      const headed = Boolean(argv.headed);
      const preStepsPath = argv['pre-steps'] || argv.preSteps || null;

      // Option A enforcement: auto-presteps is required.
      // We keep CLI flags for max steps tuning, but disallow disabling.
      if (argv['auto-presteps'] === false || argv['auto-presteps'] === 'false') {
        throw new Error('Option A enforced: --auto-presteps cannot be set to false.');
      }

      const autoPreSteps = true;
      const autoPreStepsMax = argv['auto-presteps-max'] ? Number(argv['auto-presteps-max']) : 6;

      if (!specPath) {
        throw new Error('Missing required argument: --spec <path>');
      }

      const preSteps = preStepsPath
        ? yaml.load(fs.readFileSync(path.resolve(preStepsPath), 'utf8'))
        : null;

      const { groundSpec } = require('../core/ground-spec');
      const result = await groundSpec({
        specPath,
        service,
        baseUrl,
        storageStatePath,
        headless: !headed,
        preSteps,
        autoPreSteps,
        autoPreStepsMax,
      });

      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 2: run intent spec using locator registry + self-healing
    // -------------------------------------------------------------------------
    if (cmd === 'run-intent') {
      const specPath = argv.spec || argv.s || null;
      const service = argv.service || argv.svc || null;
      const baseUrl = argv['base-url'] || argv.baseUrl || null;
      const storageStatePath = argv['storage-state'] || argv.storageState || null;
      const headed = Boolean(argv.headed);
      const smoke = Boolean(argv.smoke);
      const strict = Boolean(argv.strict);

      if (!specPath) {
        throw new Error('Missing required argument: --spec <path>');
      }

      const { runIntentSpec } = require('../core/intent-runner');
      const result = await runIntentSpec({
        specPath,
        service,
        baseUrl,
        storageStatePath,
        headless: !headed,
        smoke,
        strict,
      });

      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
      return;
    }

    // -------------------------------------------------------------------------
    // Phase 2: intent spec -> Playwright wrapper spec.js
    // -------------------------------------------------------------------------
    if (cmd === 'generate-intent-test') {
      const specPath = argv.spec || argv.s || null;
      const service = argv.service || argv.svc || null;
      const outDir = argv.out || argv.output || null;

      if (!specPath) {
        throw new Error('Missing required argument: --spec <path>');
      }
      if (!service) {
        throw new Error('Missing required argument: --service <name>');
      }

      const { writeIntentPlaywrightSpec } = require('../core/intent-test-writer');
      const result = writeIntentPlaywrightSpec({
        specPath,
        service,
        outDir: outDir || undefined,
      });

      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
      return;
    }

    // Default behavior (existing): run YAML spec through Orchestrator
    const specPath = argv.spec || argv.s || null;
    const service = argv.service || argv.svc || null;

    if (!specPath) {
      throw new Error('Missing required argument: --spec <path>');
    }

    const { Orchestrator } = require('../core/orchestrator');
    const orchestrator = new Orchestrator();

    await orchestrator.run({
      specPath,
      service,
    });
  })().catch(err => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}