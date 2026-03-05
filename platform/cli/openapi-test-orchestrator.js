'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
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
 *   5. Extract, validate, and save the generated .spec.js file
 *
 * USAGE (CLI):
 *   node platform/cli/index.js generate-from-openapi \
 *     --spec services/order-service/apis/create-order/openapi.yaml \
 *     --service order-service --api create-order --llm-provider groq
 * ============================================================================
 */

class OpenApiTestOrchestrator {
    constructor() {
        this.contextGatherer = new ContextGatherer();
        this.testsDir = path.resolve(__dirname, '../../tests/api');
    }

    /**
     * Main entry point
     * @param {Object} options
     * @param {string} options.specPath - Absolute path to the OpenAPI spec file
     * @param {string} options.serviceName - e.g. 'order-service'
     * @param {string} options.apiName    - e.g. 'create-order'
     * @param {string} [options.llmProvider='groq'] - LLM provider
     * @param {string} [options.outputDir] - Override output directory
     * @returns {Promise<{success: boolean, testFilePath: string}>}
     */
    async generate(options) {
        const { specPath, serviceName, apiName, llmProvider = 'groq', outputDir } = options;

        logger.info(`\n${'='.repeat(60)}`);
        logger.info(`  OpenAPI → Test Generator`);
        logger.info(`  Spec:     ${specPath}`);
        logger.info(`  Service:  ${serviceName}`);
        logger.info(`  API:      ${apiName}`);
        logger.info(`  LLM:      ${llmProvider}`);
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
                // context gatherer is non-critical
                context = { fixturePatterns: [], importPatterns: [], exampleTests: [], assertionPatterns: [] };
                logger.warn('  ⚠  Context gather skipped (non-critical)');
            }

            // Step 3: Build prompt
            logger.info('🧠 Step 3: Building LLM prompt...');
            const prompt = this._buildPrompt({ specContent, specObject, serviceName, apiName, context });
            logger.info(`  ✓ Prompt built (${prompt.length} characters)`);

            // Step 4: Generate via LLM
            logger.info(`🤖 Step 4: Generating tests via ${llmProvider.toUpperCase()}...`);
            const llmClient = new LLMClient(llmProvider);
            const llmResponse = await llmClient.generate({
                prompt,
                maxTokens: 3000,
                temperature: 0.4
            });

            if (!llmResponse || !llmResponse.content) {
                throw new Error('LLM returned an empty response');
            }
            logger.info('  ✓ LLM response received');

            // Step 5: Extract, validate, save
            logger.info('💾 Step 5: Saving generated test file...');
            const testCode = this._extractCode(llmResponse.content);
            this._validateCode(testCode, apiName);
            const testFilePath = await this._saveTestFile(serviceName, apiName, testCode, outputDir);
            logger.info(`  ✓ Test file saved → ${testFilePath}`);

            return { success: true, testFilePath };

        } catch (error) {
            logger.error(`\n❌ OpenAPI test generation failed: ${error.message}`);
            logger.error(error.stack);
            return { success: false, error: error.message };
        }
    }

    // ---------------------------------------------------------------------------
    // Private helpers
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
     * Build a comprehensive LLM prompt from the spec and context
     * @private
     */
    _buildPrompt({ specContent, specObject, serviceName, apiName, context }) {
        const title = specObject?.info?.title || apiName;
        const description = specObject?.info?.description || '';
        const servers = (specObject?.servers || []).map(s => s.url).join(', ') || 'https://api.example.com';

        // Truncate large specs
        const maxLines = 800;
        const specLines = specContent.split('\n');
        const truncatedSpec = specLines.length > maxLines
            ? specLines.slice(0, maxLines).join('\n') + '\n# ... (truncated)'
            : specContent;

        const examplesSection = context.exampleTests && context.exampleTests.length > 0
            ? context.exampleTests.map(ex => `### ${ex.fileName}\n\`\`\`javascript\n${ex.content}\n\`\`\``).join('\n\n')
            : 'No examples available. Follow Playwright best practices for API tests.';

        return `# Task: Generate Playwright API Test Code from OpenAPI Specification

You are an expert Playwright test automation engineer specialising in API testing.
Your job is to generate a complete, production-ready Playwright test file.

---

## OpenAPI Specification

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
- Cover every endpoint/operation defined in the spec
- Include positive (happy-path) and negative (invalid input, auth, not-found) tests

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

Generate ONLY the complete JavaScript test file. Do NOT include any markdown, explanations, or code fences. Start directly with the \`require\` imports.

Now generate the complete test file:
`;
    }

    /**
     * Remove markdown fences from LLM output
     * @private
     */
    _extractCode(content) {
        let code = content.trim();
        // Strip ```javascript ... ``` or ``` ... ```
        code = code.replace(/^```(?:javascript|js)?\n?/m, '').replace(/\n?```$/m, '').trim();
        if (code.startsWith('```')) {
            const lines = code.split('\n');
            code = lines.slice(1, -1).join('\n');
        }
        return code;
    }

    /**
     * Basic sanity checks on generated code
     * @private
     */
    _validateCode(code, apiName) {
        if (!code || code.length < 50) {
            throw new Error('Generated code is too short or empty');
        }
        if (!code.includes('require')) {
            throw new Error('Generated code is missing imports');
        }
        if (!code.includes('test.describe') && !code.includes('test(')) {
            throw new Error('Generated code is missing test structure');
        }
        if (!code.includes('expect(')) {
            throw new Error('Generated code is missing assertions');
        }
        logger.info('  ✓ Basic code validation passed');
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

        // Backup if exists
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
