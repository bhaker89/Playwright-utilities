const aiEngine = require('../core/ai-engine');
const { logger } = require('../../utils/base/logger');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { resolveFromRoot } = require('../core/workspace-root');

/**
 * UITestGenerator
 * Generates executable UI test suites from natural language descriptions
 * 
 * Features:
 * - Natural language → YAML test suite conversion
 * - Page Object Model code generation
 * - Playwright test file generation
 * - Self-healing integration
 * - Best practices enforcement
 */
class UITestGenerator {
    constructor() {
        // YAML output can remain in generated-tests (no Playwright discovery needed)
        this.outputDir = resolveFromRoot('generated-tests');

        // Playwright specs must land under ./tests because playwright.config.js uses: testDir: './tests'
        // This guarantees that `npx playwright test` picks up generated specs automatically.
        this.generatedUiSpecDir = resolveFromRoot('tests', 'ui', 'generated');

        // Page Objects remain in the shared /pages folder
        this.pagesDir = resolveFromRoot('pages');

        this._ensureDirectories();
    }

    /**
     * Generate test suite from natural language prompt
     * @param {string} prompt - Natural language test description
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} Generated test metadata
     */
    async generateFromPrompt(prompt, options = {}) {
        const {
            format = 'playwright',  // 'playwright', 'yaml', 'both'
            withPageObjects = true,
            withSelfHealing = true,
            outputPath = null,
            coverage = {
                includeNegative: false,
                includeEdge: false,
                includeErrorValidation: false,
                level: 'basic'
            }
        } = options;

        logger.info('🧠 Analyzing test requirements from prompt...');
        
        // Log coverage configuration
        if (coverage.level !== 'basic') {
            logger.info(`📊 Coverage: ${coverage.level} (Negative: ${coverage.includeNegative}, Edge: ${coverage.includeEdge}, Errors: ${coverage.includeErrorValidation})`);
        }

        try {
            // Step 1: Parse prompt and extract test intent
            const testPlan = await this._analyzePrompt(prompt);
            logger.info(`📋 Generated test plan: ${testPlan.name}`);

            // Step 2: Generate test structure
            const testSuite = await this._generateTestStructure(testPlan);
            logger.info(`✅ Test structure created with ${testSuite.tests.length} test(s)`);

            // Step 3: Generate output files
            const generatedFiles = {
                yaml: null,
                playwright: null,
                pageObjects: []
            };

            if (format === 'yaml' || format === 'both') {
                generatedFiles.yaml = await this._generateYAMLTest(testSuite, outputPath);
            }

            if (format === 'playwright' || format === 'both') {
                // PHASE 4 LOCK: Direct Playwright spec generation deprecated
                throw new Error(
                    'Direct spec generation deprecated. Use intent spec pipeline.\n' +
                    'Expected flow: TXT DSL → intent spec YAML → ground-spec → run-intent\n' +
                    'Generators may only output intent spec YAML, not executable Playwright specs.'
                );
            }

            logger.info('🎉 Test generation completed successfully!');
            this._printGenerationSummary(generatedFiles);

            return {
                success: true,
                testPlan,
                testSuite,
                files: generatedFiles
            };

        } catch (error) {
            logger.error('❌ Test generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Analyze natural language prompt and create test plan
     * @private
     */
    async _analyzePrompt(prompt, coverage = {}) {
        // Build coverage instructions
        let coverageInstructions = '';
        
        if (coverage.includeNegative || coverage.includeEdge || coverage.includeErrorValidation) {
            coverageInstructions = '\n\n**COMPREHENSIVE TEST COVERAGE REQUIRED:**\n';
            
            if (coverage.includeNegative) {
                coverageInstructions += `
- Generate NEGATIVE test cases for validation failures:
  * Invalid/empty inputs (email format, password length, required fields)
  * Wrong credentials (incorrect password, non-existent user)
  * Missing required data (empty forms, null values)
  * Boundary violations (exceed max length, negative quantities)
  * Unauthorized access attempts
  * Session/token expiration scenarios
`;
            }
            
            if (coverage.includeEdge) {
                coverageInstructions += `
- Generate EDGE CASES:
  * Boundary values (min/max quantities, string lengths)
  * Empty states (empty cart, no search results, zero items)
  * Duplicate actions (click twice, add same item multiple times)
  * Special characters in inputs
  * Very long strings
  * Browser back/forward navigation
  * Page reload during operations
`;
            }
            
            if (coverage.includeErrorValidation) {
                coverageInstructions += `
- Add ERROR MESSAGE VALIDATION:
  * Include "expectedError" field in negative test assertions
  * Verify exact error messages shown to users
  * Check error styling/visibility
  * Example: {"type": "error", "selector": ".error-message", "expected": "Invalid email format"}
`;
            }
            
            if (coverage.level === 'comprehensive') {
                coverageInstructions += `
- COMPREHENSIVE COVERAGE:
  * Generate 3-5 negative tests per positive test
  * Cover all form fields with invalid data
  * Test all navigation paths (success and failure)
  * Include timeout/performance edge cases
  * Add accessibility checks where relevant
`;
            }
            
            coverageInstructions += '\n**Organize tests into categories: "Positive Tests", "Negative Tests", "Edge Cases"**';
        }
        
        const systemPrompt = `You are an SDET AI assistant. Analyze the user's test request and create a structured test plan.

Return a JSON object with this structure:
{
    "name": "Test Suite Name",
    "description": "What this test validates",
    "baseUrl": "https://example.com",
    "pages": [
        {
            "name": "LoginPage",
            "url": "/login",
            "elements": [
                {"name": "Email Field", "type": "input", "selector": "input[type='email']"},
                {"name": "Password Field", "type": "input", "selector": "input[type='password']"},
                {"name": "Login Button", "type": "button", "selector": "button[type='submit']"},
                {"name": "Error Message", "type": "text", "selector": ".error-message"}
            ]
        }
    ],
    "testCases": [
        {
            "name": "Valid Login",
            "description": "User can login with valid credentials",
            "category": "positive",
            "steps": [
                {"action": "navigate", "page": "LoginPage"},
                {"action": "fill", "element": "Email Field", "value": "{{email}}"},
                {"action": "fill", "element": "Password Field", "value": "{{password}}"},
                {"action": "click", "element": "Login Button"},
                {"action": "waitForUrl", "url": "/dashboard"}
            ],
            "assertions": [
                {"type": "url", "expected": "/dashboard"}
            ]
        },
        {
            "name": "Invalid Email Format",
            "description": "Login fails with invalid email format",
            "category": "negative",
            "steps": [
                {"action": "navigate", "page": "LoginPage"},
                {"action": "fill", "element": "Email Field", "value": "invalid-email"},
                {"action": "fill", "element": "Password Field", "value": "{{password}}"},
                {"action": "click", "element": "Login Button"}
            ],
            "assertions": [
                {"type": "visible", "element": "Error Message"},
                {"type": "text", "element": "Error Message", "expected": "Please enter a valid email address"}
            ]
        }
    ],
    "testData": {
        "email": "test@example.com",
        "password": "password123"
    }
}

Important:
- Infer reasonable selectors based on element names
- Include data-driven test data variables
- Break complex flows into multiple test cases
- Add appropriate assertions
- Use standard web element types: input, button, select, checkbox, link, text
- Include error message elements for negative tests
- Categorize tests: "positive", "negative", or "edge"${coverageInstructions}

User Request: "${prompt}"`;

        const response = await aiEngine._callLLM(systemPrompt, prompt);
        
        // Parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response as JSON');
        }

        return JSON.parse(jsonMatch[0]);
    }

    /**
     * Generate test suite structure from test plan
     * @private
     */
    async _generateTestStructure(testPlan, coverage = {}) {
        // Organize tests by category if comprehensive coverage is enabled
        const tests = testPlan.testCases.map(tc => ({
            name: tc.name,
            description: tc.description,
            category: tc.category || 'positive',
            type: 'ui',
            steps: tc.steps,
            assertions: tc.assertions
        }));

        // Google OAuth flows are highly variable (account chooser, CAPTCHA, policy banners, 2FA, consent, etc.)
        // "Negative" tests against Google UI are usually noisy/flaky. For stability, we skip negative tests
        // whenever the suite appears to be a Google Sign-In flow.
        const isGoogleAuthFlow = (testPlan.pages || []).some(p => /google/i.test(p.name)) ||
            tests.some(t => (t.steps || []).some(s => typeof s.url === 'string' && s.url.includes('google')));

        const filteredTests = isGoogleAuthFlow
            ? tests.filter(t => t.category !== 'negative')
            : tests;

        // Group tests by category for better organization
        const testsByCategory = {
            positive: filteredTests.filter(t => t.category === 'positive'),
            negative: filteredTests.filter(t => t.category === 'negative'),
            edge: filteredTests.filter(t => t.category === 'edge')
        };

        logger.info(`📊 Test breakdown: ${testsByCategory.positive.length} positive, ${testsByCategory.negative.length} negative, ${testsByCategory.edge.length} edge cases`);

        return {
            name: testPlan.name,
            description: testPlan.description,
            baseUrl: testPlan.baseUrl,
            pages: testPlan.pages || [],
            tests: filteredTests,
            testsByCategory,
            testData: testPlan.testData || {},
            isGoogleAuthFlow
        };
    }

    /**
     * Generate YAML test file
     * @private
     */
    async _generateYAMLTest(testSuite, customPath = null) {
        const yamlContent = yaml.dump({
            name: testSuite.name,
            description: testSuite.description,
            baseUrl: testSuite.baseUrl,
            tests: testSuite.tests
        }, { indent: 2 });

        const filename = this._sanitizeFilename(testSuite.name) + '.yaml';
        const filepath = customPath || path.join(this.outputDir, 'yaml', filename);

        this._ensureDirectory(path.dirname(filepath));
        fs.writeFileSync(filepath, yamlContent, 'utf8');

        logger.info(`📄 YAML test saved: ${filepath}`);
        return filepath;
    }

    /**
     * DEPRECATED: Generate page objects for test suite
     * @deprecated Page Objects with direct locators bypass the LIE
     * @private
     */
    async _generatePageObjects(testSuite) {
        logger.warn('⚠️  Page Object generation with hardcoded selectors is deprecated.');
        logger.warn('⚠️  Use intent specs with locator registry for proper LIE routing.');
        logger.warn('⚠️  Execution path must be: intent-runner → orchestrator → LIE');
        
        // Validate locator registry exists (child repo owns locators)
        return this._validateLocatorRegistryFromTestSuite(testSuite);
    }

    /**
     * Validate locator registry exists (child repo ownership)
     * 
     * ARCHITECTURE CONTRACT:
     * - Child repos own locators (locator authority)
     * - Core repo owns flows (flow authority)
     * - Platform validates, does NOT generate
     * 
     * @private
     */
    async _validateLocatorRegistryFromTestSuite(testSuite) {
        logger.info('🔍 Validating locator registry (child repo ownership)...');
        
        const missingTargets = [];
        const registryDir = path.join(process.cwd(), 'locator-registry', 'services', 'default');
        
        for (const page of testSuite.pages) {
            const feature = this._toKebabCase(page.name);
            const registryPath = path.join(registryDir, `${feature}.yaml`);
            
            // Check if registry file exists
            if (!fs.existsSync(registryPath)) {
                logger.error(`❌ Missing locator registry: ${registryPath}`);
                logger.error(`   Create this file in your child repo with required targets.`);
                
                // Collect all missing targets from this page
                for (const element of page.elements) {
                    const targetKey = this._elementToTargetKey(element.name);
                    missingTargets.push({
                        feature,
                        target: targetKey,
                        description: element.name,
                        type: element.type,
                        registryPath
                    });
                }
                continue;
            }
            
            // Load existing registry and validate targets
            const existingRegistry = yaml.load(fs.readFileSync(registryPath, 'utf8'));
            
            for (const element of page.elements) {
                const targetKey = this._elementToTargetKey(element.name);
                
                if (!existingRegistry[targetKey]) {
                    missingTargets.push({
                        feature,
                        target: targetKey,
                        description: element.name,
                        type: element.type,
                        registryPath
                    });
                }
            }
        }
        
        // If any targets are missing, fail with clear instructions
        if (missingTargets.length > 0) {
            logger.error('\n' + '='.repeat(80));
            logger.error('❌ LOCATOR REGISTRY VALIDATION FAILED');
            logger.error('='.repeat(80));
            logger.error('\nMissing locator targets in child repo registry:\n');
            
            // Group by registry file
            const byRegistry = {};
            for (const missing of missingTargets) {
                if (!byRegistry[missing.registryPath]) {
                    byRegistry[missing.registryPath] = [];
                }
                byRegistry[missing.registryPath].push(missing);
            }
            
            for (const [registryPath, targets] of Object.entries(byRegistry)) {
                logger.error(`📁 ${registryPath}`);
                logger.error('   Add these targets:\n');
                
                for (const target of targets) {
                    logger.error(`   ${target.target}:`);
                    logger.error(`     primary: 'SELECTOR_HERE'  # ${target.description}`);
                    logger.error(`     fallbacks: []`);
                    logger.error(`     description: ${target.description}`);
                    logger.error(`     type: ${target.type}\n`);
                }
            }
            
            logger.error('='.repeat(80));
            logger.error('ARCHITECTURE CONTRACT:');
            logger.error('  ✅ Child repos = locator authority (you define selectors)');
            logger.error('  ✅ Core repo = flow authority (platform manages execution)');
            logger.error('  ❌ Platform does NOT auto-generate selectors');
            logger.error('='.repeat(80) + '\n');
            
            throw new Error(
                `Locator registry validation failed: ${missingTargets.length} missing target(s). ` +
                `Create locator definitions in child repo: locator-registry/services/<service>/<feature>.yaml`
            );
        }
        
        logger.info(`✅ Locator registry validation passed`);
        return [];
    }


    /**
     * DEPRECATED: Generate Page Object class code
     * @deprecated This generates code with direct page.locator() calls that bypass LIE
     * @private
     */
    _generatePageObjectCode(pageConfig, baseUrl) {
        throw new Error(
            '❌ EXECUTION PATH LOCKED: Page Object generation with direct locators is disabled.\n' +
            '✅ Use locator registry instead:\n' +
            '   - Locator registry defines selectors: locator-registry/services/<service>/<feature>.yaml\n' +
            '   - Intent specs reference logical targets\n' +
            '   - Execution: intent-runner → orchestrator → locator-orchestrator → LIE'
        );
        
        const { name, url, elements } = pageConfig;

        // Generate element locator methods (DEPRECATED - bypasses orchestrator)
        const elementMethods = elements.map(el => {
            const methodName = this._toCamelCase(el.name);
            const selectorComment = `// ${el.name}: ${el.selector}`;
            
            let locatorCode;
            if (el.type === 'button') {
                locatorCode = `this.page.getByRole('button', { name: /${el.name.replace(' Button', '')}/i })`;
            } else {
                // IMPORTANT: Always escape selectors safely.
                // Many CSS selectors contain single quotes (e.g. input[type='email']), which would break JS strings.
                // JSON.stringify produces a valid JS string literal every time.
                locatorCode = `this.page.locator(${JSON.stringify(el.selector)})`;
            }

            return `
    /**
     * Get ${el.name} locator
     * @returns {Locator}
     */
    get ${methodName}() {
        ${selectorComment}
        return ${locatorCode};
    }`;
        }).join('\n');

        // Generate action methods with self-healing
        const actionMethods = elements.map(el => {
            const methodName = this._toCamelCase(el.name);
            
            if (el.type === 'input') {
                return `
    /**
     * Fill ${el.name}
     * @param {string} value - Value to fill
     */
    async fill${this._toPascalCase(el.name)}(value) {
        await this.healer.executeWithHealing(
            '${el.name}',
            this.${methodName},
            async (loc) => await loc.fill(value)
        );
    }`;
            } else if (el.type === 'button' || el.type === 'link') {
                return `
    /**
     * Click ${el.name}
     */
    async click${this._toPascalCase(el.name)}() {
        await this.healer.executeWithHealing(
            '${el.name}',
            this.${methodName},
            async (loc) => await loc.click()
        );
    }`;
            } else if (el.type === 'select') {
                return `
    /**
     * Select option in ${el.name}
     * @param {string} value - Option value to select
     */
    async select${this._toPascalCase(el.name)}(value) {
        await this.healer.executeWithHealing(
            '${el.name}',
            this.${methodName},
            async (loc) => await loc.selectOption(value)
        );
    }`;
            }
            return '';
        }).join('\n');

        return `const { BasePage } = require('./base.page');

/**
 * ${name}
 * Generated Page Object with self-healing support
 * 
 * URL: ${url}
 * Base URL: ${baseUrl}
 */
class ${name} extends BasePage {
    constructor(page) {
        super(page);
        this.url = '${url}';
    }

    /**
     * Navigate to this page
     */
    async navigate() {
        await this.page.goto('${baseUrl}${url}');
        await this.page.waitForLoadState('networkidle');
    }
${elementMethods}
${actionMethods}

    /**
     * Wait for page to be loaded
     */
    async waitForPageLoad() {
        await this.page.waitForURL('**${url}**');
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Verify page is loaded
     * @returns {Promise<boolean>}
     */
    async isPageLoaded() {
        return this.page.url().includes('${url}');
    }
}

module.exports = { ${name} };
`;
    }

    /**
     * Generate Intent Spec YAML instead of direct Playwright code
     * 
     * EXECUTION PATH ENFORCEMENT:
     * Prompt → Intent Spec YAML → intent-runner → UIEngine → orchestrator → LIE
     * 
     * @private
     */
    async _generatePlaywrightTest(testSuite, withPageObjects, withSelfHealing, customPath = null) {
        const filename = this._sanitizeFilename(testSuite.name) + '.intent.yaml';
        
        // Generate intent spec YAML that will be executed via intent-runner.js
        const intentSpecPath = customPath || path.join(this.outputDir, filename);
        
        const intentSpec = this._generateIntentSpec(testSuite);
        
        this._ensureDirectory(path.dirname(intentSpecPath));
        fs.writeFileSync(intentSpecPath, yaml.dump(intentSpec), 'utf8');
        
        logger.info(`📋 Intent spec saved: ${intentSpecPath}`);
        logger.info(`ℹ️  Execute with: node platform/cli/run-intent.js --spec ${intentSpecPath}`);
        logger.info(`⚠️  Direct Playwright code generation is deprecated. All execution must go through intent-runner.js`);
        
        return intentSpecPath;
    }

    /**
     * Generate Intent Spec from test suite
     * @private
     */
    _generateIntentSpec(testSuite) {
        const feature = this._sanitizeFilename(testSuite.name);
        
        return {
            metadata: {
                service: 'default',
                generated_by: 'ui-test-code-generator',
                created_at: new Date().toISOString(),
                description: testSuite.description,
            },
            intent: {
                primary_action: testSuite.name,
                feature: feature,
                description: testSuite.description,
            },
            testSuite: {
                name: testSuite.name,
                baseUrl: testSuite.baseUrl,
            },
            steps: this._convertTestSuiteToIntentSteps(testSuite),
            assertions: this._convertTestSuiteToIntentAssertions(testSuite),
        };
    }

    /**
     * Convert test suite to intent spec steps
     * @private
     */
    _convertTestSuiteToIntentSteps(testSuite) {
        const allSteps = [];
        
        // Combine all test case steps into a single flow for intent execution
        for (const test of testSuite.tests) {
            for (const step of test.steps) {
                if (step.action === 'navigate') {
                    const pageUrl = this._findPageUrl(step.page, testSuite.pages);
                    allSteps.push({
                        action: 'navigate',
                        url: pageUrl || '/',
                    });
                } else if (step.action === 'fill') {
                    const targetKey = this._elementToTargetKey(step.element);
                    const value = this._resolveTestDataValue(step.value, testSuite.testData);
                    allSteps.push({
                        action: 'fill',
                        target: targetKey,
                        value: value,
                    });
                } else if (step.action === 'click') {
                    const targetKey = this._elementToTargetKey(step.element);
                    allSteps.push({
                        action: 'click',
                        target: targetKey,
                    });
                } else if (step.action === 'waitForUrl') {
                    // Skip waitForUrl, it's handled by intent-runner's navigation
                    continue;
                }
            }
        }
        
        return allSteps;
    }

    /**
     * Convert test suite to intent spec assertions
     * @private
     */
    _convertTestSuiteToIntentAssertions(testSuite) {
        const allAssertions = [];
        
        for (const test of testSuite.tests) {
            for (const assertion of test.assertions || []) {
                if (assertion.type === 'url') {
                    allAssertions.push({
                        type: 'url_contains',
                        target: 'current-page',
                        expected: assertion.expected,
                    });
                } else if (assertion.type === 'visible') {
                    const targetKey = assertion.element 
                        ? this._elementToTargetKey(assertion.element)
                        : 'visible-element';
                    allAssertions.push({
                        type: 'visible',
                        target: targetKey,
                        expected: true,
                    });
                } else if (assertion.type === 'text') {
                    const targetKey = assertion.element 
                        ? this._elementToTargetKey(assertion.element)
                        : 'text-element';
                    allAssertions.push({
                        type: 'text',
                        target: targetKey,
                        expected: assertion.expected,
                    });
                }
            }
        }
        
        return allAssertions;
    }

    /**
     * Convert element name to target key (kebab-case)
     * @private
     */
    _elementToTargetKey(elementName) {
        return String(elementName || 'element')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Find page URL from pages array
     * @private
     */
    _findPageUrl(pageName, pages) {
        const page = pages.find(p => p.name === pageName);
        return page?.url || '/';
    }

    /**
     * Resolve test data value (replace {{variables}})
     * @private
     */
    _resolveTestDataValue(value, testData) {
        return String(value).replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return testData[key] || match;
        });
    }

    /**
     * DEPRECATED: Generate POM-style Playwright test
     * @deprecated Use _generateIntentSpec instead
     * @private
     */
    _generatePOMTest(testSuite, withSelfHealing, specFilePath) {
        throw new Error(
            '❌ EXECUTION PATH LOCKED: Direct Playwright spec generation is disabled.\n' +
            '✅ Use intent spec pipeline instead:\n' +
            '   TXT → intent-spec → intent-runner → orchestrator → LIE\n' +
            '   Call generateFromPrompt() with format="yaml" or format="both"'
        );
        const specDir = path.dirname(specFilePath);
        const pagesRelativeDir = path.relative(specDir, this.pagesDir).split(path.sep).join('/');
        const pagesRequireBase = pagesRelativeDir.startsWith('.') ? pagesRelativeDir : `./${pagesRelativeDir}`;

        const imports = testSuite.pages.map(page => {
            const filename = this._toKebabCase(page.name) + '.page';
            return `const { ${page.name} } = require('${pagesRequireBase}/${filename}');`;
        }).join('\n');

        // Group tests by category if available
        const hasCategories = testSuite.testsByCategory && 
            (testSuite.testsByCategory.negative.length > 0 || testSuite.testsByCategory.edge.length > 0);
        
        const generateTestCase = (test) => {
            const steps = test.steps.map(step => {
                if (step.action === 'navigate') {
                    const pageName = step.page.charAt(0).toLowerCase() + step.page.slice(1);
                    return `await ${pageName}.navigate();`;
                } else if (step.action === 'fill') {
                    const pageName = this._inferPageName(step, testSuite.pages);
                    const methodName = `fill${this._toPascalCase(step.element)}`;
                    const value = step.value.replace(/\{\{(\w+)\}\}/, (_, key) => {
                        return `testData.${key}`;
                    });
                    return `await ${pageName}.${methodName}(${value.includes('testData') ? value : `'${value}'`});`;
                } else if (step.action === 'click') {
                    const pageName = this._inferPageName(step, testSuite.pages);
                    const methodName = `click${this._toPascalCase(step.element)}`;
                    return `await ${pageName}.${methodName}();`;
                } else if (step.action === 'waitForUrl') {
                    return `await page.waitForURL('**${step.url}**');`;
                }
                return `// TODO: Handle ${step.action}`;
            }).join('\n        ');

            const assertions = test.assertions.map(assertion => {
                if (assertion.type === 'url') {
                    return `expect(page.url()).toContain('${assertion.expected}');`;
                } else if (assertion.type === 'visible') {
                    return `await expect(page.locator('${assertion.selector}')).toBeVisible();`;
                } else if (assertion.type === 'text') {
                    return `await expect(page.locator('${assertion.selector}')).toHaveText('${assertion.expected}');`;
                } else if (assertion.type === 'error') {
                    // Error message assertion for negative tests
                    const selector = assertion.selector || this._findElementSelector(assertion.element, testSuite.pages);
                    return `await expect(page.locator('${selector}')).toContainText('${assertion.expected}');`;
                }
                return `// TODO: Handle ${assertion.type} assertion`;
            }).join('\n        ');

            const pageInstances = testSuite.pages.map(page => {
                const instanceName = page.name.charAt(0).toLowerCase() + page.name.slice(1);
                return `const ${instanceName} = new ${page.name}(page);`;
            }).join('\n        ');

            // Env-only secret handling for Google login.
            // We never embed Google credentials in generated specs.
            const testDataBlock = (testSuite.isGoogleAuthFlow || testSuite.testData?.googleEmail || testSuite.testData?.googlePassword)
                ? `const testData = {
            googleEmail: process.env.GOOGLE_TEST_EMAIL,
            googlePassword: process.env.GOOGLE_TEST_PASSWORD
        };

        if (!testData.googleEmail || !testData.googlePassword) {
            throw new Error('Missing GOOGLE_TEST_EMAIL / GOOGLE_TEST_PASSWORD in config/.env.<env>');
        }`
                : `const testData = ${JSON.stringify(testSuite.testData, null, 8)};`;

            return `
    test('${test.name}', async ({ page }) => {
        // Test: ${test.description}
        ${pageInstances}

        ${testDataBlock}

        ${steps}

        // Assertions
        ${assertions}
    });`;
        };
        
        // Generate organized test output
        let testCases = '';
        
        if (hasCategories) {
            // Organize by category
            if (testSuite.testsByCategory.positive.length > 0) {
                const positiveTests = testSuite.testsByCategory.positive.map(generateTestCase).join('\n');
                testCases += `\n    test.describe('✅ Positive Tests', () => {${positiveTests}\n    });\n`;
            }
            
            if (testSuite.testsByCategory.negative.length > 0) {
                const negativeTests = testSuite.testsByCategory.negative.map(generateTestCase).join('\n');
                testCases += `\n    test.describe('❌ Negative Tests', () => {${negativeTests}\n    });\n`;
            }
            
            if (testSuite.testsByCategory.edge.length > 0) {
                const edgeTests = testSuite.testsByCategory.edge.map(generateTestCase).join('\n');
                testCases += `\n    test.describe('⚡ Edge Cases', () => {${edgeTests}\n    });\n`;
            }
        } else {
            // No categories, generate flat list
            testCases = testSuite.tests.map(generateTestCase).join('\n');
        }

        return `const { test, expect } = require('@playwright/test');
${imports}

/**
 * ${testSuite.name}
 * ${testSuite.description}
 * 
 * Generated with UI Test Generator
 * Self-Healing: ${withSelfHealing ? 'Enabled' : 'Disabled'}
 */
test.describe('${testSuite.name}', () => {
    test.beforeEach(async ({ page }) => {
        // Setup code
        await page.goto('${testSuite.baseUrl}');
    });
${testCases}
});
`;
    }

    /**
     * DEPRECATED: Generate direct Playwright test (no POM)
     * @deprecated Use _generateIntentSpec instead
     * @private
     */
    _generateDirectTest(testSuite, withSelfHealing) {
        throw new Error(
            '❌ EXECUTION PATH LOCKED: Direct page.locator() test generation is disabled.\n' +
            '✅ Use intent spec pipeline instead:\n' +
            '   TXT → intent-spec → intent-runner → orchestrator → LIE\n' +
            '   This ensures all locator resolution goes through locator-orchestrator.js'
        );

        return `const { test, expect } = require('@playwright/test');
${healingImport}
/**
 * ${testSuite.name}
 * ${testSuite.description}
 * 
 * Generated with UI Test Generator
 * Self-Healing: ${withSelfHealing ? 'Enabled' : 'Disabled'}
 */
test.describe('${testSuite.name}', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('${testSuite.baseUrl}');
    });
${testCases}
});
`;
    }

    /**
     * Helper: Infer page name from step
     * @private
     */
    _inferPageName(step, pages) {
        for (const page of pages) {
            const hasElement = page.elements.some(el => el.name === step.element);
            if (hasElement) {
                return page.name.charAt(0).toLowerCase() + page.name.slice(1);
            }
        }
        return 'page';
    }

    /**
     * Helper: Find element selector
     * @private
     */
    _findElementSelector(elementName, pages) {
        for (const page of pages) {
            const element = page.elements.find(el => el.name === elementName);
            if (element) {
                return element.selector;
            }
        }
        return `[aria-label="${elementName}"]`;
    }

    /**
     * Print generation summary
     * @private
     */
    _printGenerationSummary(files) {
        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║         🎉 UI Test Generation Complete                       ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');

        if (files.yaml) {
            console.log(`📄 YAML Test:     ${files.yaml}`);
        }

        if (files.playwright) {
            console.log(`🎭 Playwright Test: ${files.playwright}`);
        }

        if (files.pageObjects.length > 0) {
            console.log(`📦 Page Objects (${files.pageObjects.length}):`);
            files.pageObjects.forEach(po => {
                console.log(`   - ${po.className}: ${po.filepath}`);
            });
        }

        console.log('\n💡 Next Steps:');
        console.log('   1. Review generated test files');
        console.log('   2. Adjust selectors if needed');
        console.log('   3. Run tests: npx playwright test');
        console.log('   4. Enjoy self-healing! 🩹\n');
    }

    /**
     * Helper utilities
     */

    _ensureDirectories() {
        const dirs = [
            this.outputDir,
            path.join(this.outputDir, 'yaml'),
            // Playwright specs are written under ./tests/ui/generated (not under generated-tests)
            this.generatedUiSpecDir,
            this.pagesDir
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    _ensureDirectory(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    _sanitizeFilename(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    _toKebabCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();
    }

    _toCamelCase(str) {
        // Make sure the generated identifier is a valid JS property name.
        // Example: "Google Sign-In Button" -> "googleSignInButton" (hyphens removed)
        const normalized = String(str)
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim();

        return normalized
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
                index === 0 ? letter.toLowerCase() : letter.toUpperCase()
            )
            .replace(/\s+/g, '');
    }

    _toPascalCase(str) {
        // Example: "Google Sign-In Button" -> "GoogleSignInButton"
        const normalized = String(str)
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim();

        return normalized
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter) => letter.toUpperCase())
            .replace(/\s+/g, '');
    }
}

module.exports = { UITestGenerator };