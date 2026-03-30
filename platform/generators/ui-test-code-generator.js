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
                if (withPageObjects) {
                    generatedFiles.pageObjects = await this._generatePageObjects(testSuite);
                }
                generatedFiles.playwright = await this._generatePlaywrightTest(
                    testSuite, 
                    withPageObjects,
                    withSelfHealing,
                    outputPath
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
     * Generate Page Object classes
     * @private
     */
    async _generatePageObjects(testSuite) {
        const generatedFiles = [];

        for (const pageConfig of testSuite.pages) {
            const pageClassName = pageConfig.name;
            const pageFilename = this._toKebabCase(pageClassName) + '.page.js';
            const filepath = path.join(this.pagesDir, pageFilename);

            const pageObjectCode = this._generatePageObjectCode(pageConfig, testSuite.baseUrl);

            fs.writeFileSync(filepath, pageObjectCode, 'utf8');
            logger.info(`📦 Page Object created: ${filepath}`);

            generatedFiles.push({
                className: pageClassName,
                filename: pageFilename,
                filepath
            });
        }

        return generatedFiles;
    }

    /**
     * Generate Page Object class code
     * @private
     */
    _generatePageObjectCode(pageConfig, baseUrl) {
        const { name, url, elements } = pageConfig;

        // Generate element locator methods
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
     * Generate Playwright test file
     * @private
     */
    async _generatePlaywrightTest(testSuite, withPageObjects, withSelfHealing, customPath = null) {
        const filename = this._sanitizeFilename(testSuite.name) + '.spec.js';

        // Default location: under ./tests so Playwright auto-discovers it.
        // If a customPath is provided explicitly, we respect it.
        const filepath = customPath || path.join(this.generatedUiSpecDir, filename);

        const testCode = withPageObjects
            ? this._generatePOMTest(testSuite, withSelfHealing, filepath)
            : this._generateDirectTest(testSuite, withSelfHealing, filepath);

        this._ensureDirectory(path.dirname(filepath));
        fs.writeFileSync(filepath, testCode, 'utf8');

        logger.info(`🎭 Playwright test saved: ${filepath}`);
        return filepath;
    }

    /**
     * Generate POM-style Playwright test
     * @private
     */
    _generatePOMTest(testSuite, withSelfHealing, specFilePath) {
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
     * Generate direct Playwright test (no POM)
     * @private
     */
    _generateDirectTest(testSuite, withSelfHealing) {
        const healingImport = withSelfHealing 
            ? `const { SmartLocator } = require('../../platform/core/smart-locator');\n`
            : '';

        // Group tests by category if available
        const hasCategories = testSuite.testsByCategory && 
            (testSuite.testsByCategory.negative.length > 0 || testSuite.testsByCategory.edge.length > 0);

        const generateTestCase = (test) => {
            const healerInit = withSelfHealing
                ? `\n        const healer = new SmartLocator(page, '${testSuite.name}');`
                : '';

            const steps = test.steps.map(step => {
                if (step.action === 'navigate') {
                    return `await page.goto('${testSuite.baseUrl}${step.page}');`;
                } else if (step.action === 'fill') {
                    const locator = this._findElementSelector(step.element, testSuite.pages);
                    const value = step.value.replace(/\{\{(\w+)\}\}/, (_, key) => {
                        return `\${testData.${key}}`;
                    });

                    if (withSelfHealing) {
                        return `await healer.executeWithHealing('${step.element}', page.locator('${locator}'), async (loc) => await loc.fill('${value}'));`;
                    }
                    return `await page.locator('${locator}').fill('${value}');`;
                } else if (step.action === 'click') {
                    const locator = this._findElementSelector(step.element, testSuite.pages);
                    
                    if (withSelfHealing) {
                        return `await healer.executeWithHealing('${step.element}', page.locator('${locator}'), async (loc) => await loc.click());`;
                    }
                    return `await page.locator('${locator}').click();`;
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
                return `// TODO: Handle ${assertion.type}`;
            }).join('\n        ');

            return `
    test('${test.name}', async ({ page }) => {
        // Test: ${test.description}${healerInit}
        
        const testData = ${JSON.stringify(testSuite.testData, null, 8)};

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