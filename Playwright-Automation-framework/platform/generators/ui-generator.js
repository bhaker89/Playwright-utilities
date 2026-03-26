const { LLMClient } = require('./llm-client');
const { logger } = require('../../utils/base/logger');
const componentRegistry = require('../core/component-registry');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(process.cwd(), 'config', '.env.stag') });

/**
 * UIGenerator
 * Transforms parsed CSV steps into Pure-AI Page Objects and executable Specs.
 * No manual POM maintenance required.
 */
class UIGenerator {
    constructor() {
        this.llm = new LLMClient(process.env.AI_PROVIDER || 'groq');
    }

    /**
     * Orchestrate full generation (Page + Spec)
     * @param {Object} testCase
     */
    async process(testCase) {
        logger.info(`🚀 Starting Pure-AI Generation for: ${testCase.title}`);

        // 1. Resolve locators
        const stepMetadata = await this.discoverLocators(testCase.title, testCase.steps);

        // 2. Generate Page Object
        const pageClassName = this._toClassName(testCase.title) + 'Page';
        const pagePath = await this.generatePageObject(pageClassName, stepMetadata);

        // 3. Generate Spec
        const specPath = await this.generateSpec(testCase, pageClassName, pagePath);

        return { specPath, pagePath };
    }

    /**
     * Generate a standalone Page Object class
     */
    async generatePageObject(className, stepMetadata) {
        logger.info(`🛠️  Generating Page Object: ${className}`);

        const prompt = `
      You are a Senior Playwright Architect. Generate a Page Object class.
      Class Name: ${className}
      Inherit from: BasePage (imported from '../../../../pages/base.page')
      
      Locators to implement as methods:
      ${JSON.stringify(stepMetadata, null, 2)}

      RULES:
      1. Use 'this.page.getByRole', 'this.page.getByLabel', etc. inside the constructor or methods.
      2. Every unique button/input should have a descriptive method (e.g., clickLoginButton(), fillUsername(val)).
      3. Use 'await this.click(locator, name)' and 'await this.fill(locator, val, name)' from BasePage for logging.
      4. Output ONLY the code. No markdown.
    `;

        const result = await this.llm.generate({ prompt });
        let code = result.content.replace(/```javascript/g, '').replace(/```/g, '').trim();

        const filePath = path.join(process.cwd(), 'tests', 'ui', 'generated', 'pages', `${className.toLowerCase()}.page.js`);
        this._writeBuffer(filePath, code);
        return filePath;
    }

    /**
     * Generate a spec file using the generated POM
     */
    async generateSpec(testCase, pageClassName, pagePath) {
        logger.info(`📝 Generating Spec for: ${testCase.title}`);

        const relativePagePath = `./pages/${path.basename(pagePath)}`;
        const prompt = `
      Generate a Playwright test spec.
      Test Title: ${testCase.title}
      Generated Page Object: ${pageClassName} from '${relativePagePath}'
      Steps: ${testCase.steps.join(' -> ')}
      
      RULES:
      1. import { test, expect } from '../../../../fixtures/base-test';
      2. import { ${pageClassName} } from '${relativePagePath}';
      3. Use 'test.beforeEach' to initialize the page object.
      4. Use the page object methods to execute the steps.
      5. Include a clear 'expect' assertion based on: ${testCase.expected}.
      6. Output ONLY code.
    `;

        const result = await this.llm.generate({ prompt });
        let code = result.content.replace(/```javascript/g, '').replace(/```/g, '').trim();

        const filePath = path.join(process.cwd(), 'tests', 'ui', 'generated', 'specs', `${testCase.title.toLowerCase().replace(/\s+/g, '-')}.spec.js`);
        this._writeBuffer(filePath, code);
        return filePath;
    }

    /**
     * Discover locators for a set of steps using AI/RAG
     */
    async discoverLocators(pageName, steps) {
        const metadata = {};
        for (const step of steps) {
            const entity = this._extractEntity(step);
            let locator = componentRegistry.get(pageName, entity);
            if (!locator) {
                locator = this._simulateDiscovery(step, entity);
                componentRegistry.register(pageName, entity, locator);
            }
            metadata[step] = locator;
        }
        return metadata;
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
