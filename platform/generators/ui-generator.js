const { LLMClient } = require('./llm-client');
const { logger } = require('../../utils/base/logger');
const componentRegistry = require('../core/component-registry');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

require('dotenv').config({ path: path.join(process.cwd(), 'config', '.env.stag') });

/**
 * UIGenerator
 * Transforms parsed CSV steps into Intent Specs for execution via intent-runner.js
 * 
 * EXECUTION PATH ENFORCEMENT:
 * CSV/Prompt → UIGenerator → Intent Spec YAML → intent-runner → orchestrator → LIE
 * 
 * NO LONGER GENERATES:
 * - Direct Playwright code (page.locator, page.click, etc.)
 * - Page Object Models with hardcoded selectors
 */
class UIGenerator {
    constructor() {
        this.llm = new LLMClient(process.env.AI_PROVIDER || 'groq');
        this.intentSpecDir = path.join(process.cwd(), 'specs', 'intent');
    }

    /**
     * Generate Intent Spec from test case
     * @param {Object} testCase
     */
    async process(testCase) {
        logger.info(`🚀 Generating Intent Spec for: ${testCase.title}`);

        // 1. Discover logical target names (not raw selectors)
        const targetRegistry = await this.discoverTargets(testCase.title, testCase.steps);

        // 2. Generate Intent Spec YAML (replaces Page Object + Spec generation)
        const intentSpecPath = await this.generateIntentSpec(testCase, targetRegistry);

        // 3. Validate locator registry exists (child repo owns locators)
        await this.validateLocatorRegistry(testCase.title, targetRegistry);

        logger.info(`✅ Intent spec generated: ${intentSpecPath}`);
        logger.info(`ℹ️  Run with: node platform/cli/run-intent.js --spec ${intentSpecPath}`);
        logger.warn(`⚠️  Ensure locator registry exists in child repo: locator-registry/services/<service>/${this._toKebabCase(testCase.title)}.yaml`);

        return { intentSpecPath };
    }

    /**
     * Generate Intent Spec YAML (replaces direct Playwright code generation)
     */
    async generateIntentSpec(testCase, targetRegistry) {
        logger.info(`📝 Generating Intent Spec YAML for: ${testCase.title}`);

        const feature = this._toKebabCase(testCase.title);
        const intentSpec = {
            metadata: {
                service: testCase.service || 'default',
                generated_by: 'ui-generator',
                created_at: new Date().toISOString(),
            },
            intent: {
                primary_action: testCase.title,
                feature: feature,
                description: testCase.expected || testCase.title,
            },
            steps: this._convertStepsToIntentFormat(testCase.steps, targetRegistry),
            assertions: this._generateAssertions(testCase),
        };

        const filePath = path.join(this.intentSpecDir, `${feature}.intent.yaml`);
        this._writeBuffer(filePath, yaml.dump(intentSpec));
        
        return filePath;
    }

    /**
     * Validate locator registry exists in child repo (does NOT generate)
     * 
     * ARCHITECTURE CONTRACT:
     * - Child repos own locators (locator authority)
     * - Core repo owns flows (flow authority)
     * - Platform validates, does NOT generate
     */
    async validateLocatorRegistry(featureName, targetRegistry) {
        logger.info(`🔍 Validating locator registry for: ${featureName}`);

        const registryPath = path.join(
            process.cwd(),
            'locator-registry',
            'services',
            'default',
            `${this._toKebabCase(featureName)}.yaml`
        );

        // Check if registry file exists
        if (!fs.existsSync(registryPath)) {
            logger.error(`\n${'='.repeat(80)}`);
            logger.error('❌ LOCATOR REGISTRY VALIDATION FAILED');
            logger.error('='.repeat(80));
            logger.error(`\nMissing locator registry: ${registryPath}\n`);
            logger.error('Create this file in your child repo with targets:\n');
            
            for (const [targetKey, locatorInfo] of Object.entries(targetRegistry)) {
                logger.error(`${targetKey}:`);
                logger.error(`  primary: 'SELECTOR_HERE'  # ${locatorInfo.description}`);
                logger.error(`  fallbacks: []`);
                logger.error(`  description: ${locatorInfo.description}`);
                logger.error('');
            }
            
            logger.error('='.repeat(80));
            logger.error('ARCHITECTURE CONTRACT:');
            logger.error('  ✅ Child repos = locator authority (you define selectors)');
            logger.error('  ✅ Core repo = flow authority (platform manages execution)');
            logger.error('  ❌ Platform does NOT auto-generate selectors');
            logger.error('='.repeat(80) + '\n');
            
            throw new Error(
                `Locator registry validation failed. ` +
                `Create registry in child repo: ${registryPath}`
            );
        }

        // Load and validate targets exist
        const existingRegistry = yaml.load(fs.readFileSync(registryPath, 'utf8'));
        const missingTargets = [];
        
        for (const [targetKey, locatorInfo] of Object.entries(targetRegistry)) {
            if (!existingRegistry[targetKey]) {
                missingTargets.push({ targetKey, description: locatorInfo.description });
            }
        }
        
        if (missingTargets.length > 0) {
            logger.error(`\n❌ Missing targets in ${registryPath}:\n`);
            for (const missing of missingTargets) {
                logger.error(`${missing.targetKey}:`);
                logger.error(`  primary: 'SELECTOR_HERE'  # ${missing.description}`);
                logger.error(`  fallbacks: []`);
                logger.error('');
            }
            
            throw new Error(
                `Locator registry validation failed: ${missingTargets.length} missing target(s) in ${registryPath}`
            );
        }

        logger.info(`✅ Locator registry validation passed: ${registryPath}`);
    }

    /**
     * Discover logical target names (not raw selectors)
     * Returns registry mapping for intent specs
     */
    async discoverTargets(pageName, steps) {
        const targetRegistry = {};
        
        for (const step of steps) {
            const entity = this._extractEntity(step);
            const targetKey = this._toKebabCase(entity);
            
            let locator = componentRegistry.get(pageName, entity);
            if (!locator) {
                locator = this._simulateDiscovery(step, entity);
                componentRegistry.register(pageName, entity, locator);
            }
            
            targetRegistry[targetKey] = {
                selector: this._locatorToSelector(locator),
                description: `${entity} for ${step}`,
                fallbacks: this._generateFallbackSelectors(locator),
            };
        }
        
        return targetRegistry;
    }

    /**
     * Convert steps to intent spec format (use target keys, not selectors)
     */
    _convertStepsToIntentFormat(steps, targetRegistry) {
        return steps.map(step => {
            const entity = this._extractEntity(step);
            const targetKey = this._toKebabCase(entity);
            
            if (step.toLowerCase().includes('navigate') || step.toLowerCase().includes('go to')) {
                return {
                    action: 'navigate',
                    url: '/', // Placeholder, should be derived from context
                };
            }
            
            if (step.toLowerCase().includes('enter') || step.toLowerCase().includes('type')) {
                return {
                    action: 'fill',
                    target: targetKey,
                    value: '{{test_value}}', // Placeholder for test data
                };
            }
            
            if (step.toLowerCase().includes('click')) {
                return {
                    action: 'click',
                    target: targetKey,
                };
            }
            
            // Default to click for unknown steps
            return {
                action: 'click',
                target: targetKey,
            };
        });
    }

    /**
     * Generate assertions from test case expectations
     */
    _generateAssertions(testCase) {
        if (!testCase.expected) return [];
        
        // Simple heuristic: if expected contains "visible", "shown", or "appears"
        if (/visible|shown|appears/i.test(testCase.expected)) {
            return [{
                type: 'visible',
                target: 'result-element',
                expected: true,
            }];
        }
        
        // If expected contains URL-related terms
        if (/url|page|redirect/i.test(testCase.expected)) {
            return [{
                type: 'url_contains',
                target: 'current-page',
                expected: testCase.expected.toLowerCase(),
            }];
        }
        
        return [];
    }


    _writeBuffer(filePath, content) {
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }
        fs.writeFileSync(filePath, content);
    }

    _toClassName(str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase()).replace(/\s+/g, '');
    }

    _toKebabCase(str) {
        return str
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    _simulateDiscovery(step, entity) {
        const role = step.toLowerCase().includes('enter') || step.toLowerCase().includes('type') ? 'textbox' : 'button';
        return { role, name: entity };
    }

    _extractEntity(step) {
        const match = step.match(/(on|into|the)\s+([a-zA-Z\s]+)/i);
        return match ? match[2].trim().replace(/^the\s+/i, '') : 'element';
    }
}

module.exports = new UIGenerator();
