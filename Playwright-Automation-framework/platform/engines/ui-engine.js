const { logger } = require('../../utils/base/logger');
const { SelfHealer } = require('./self-healer');

/**
 * Executes UI test steps from YAML definitions with integrated self-healing
 */
class UIEngine {
    /**
     * @param {import('@playwright/test').Page} page 
     */
    constructor(page) {
        this.page = page;
        this.healer = new SelfHealer(page);
    }

    /**
     * Execute a set of steps from a YAML test case
     * @param {Array} steps 
     */
    async executeSteps(steps) {
        for (const step of steps) {
            await this.executeStep(step);
        }
    }

    /**
     * Execute a single UI step
     * @param {Object} step 
     */
    async executeStep(step) {
        const { action, selector, value, url } = step;
        logger.info(`UI: Executing action "${action}" ${selector ? `on "${selector}"` : ''}`);

        switch (action) {
            case 'goto':
            case 'navigate':
                await this.page.goto(url);
                break;

            case 'click':
                await this.healer.withHealing(async (sel) => {
                    await this.page.click(sel);
                }, selector);
                break;

            case 'fill':
            case 'type':
                await this.healer.withHealing(async (sel) => {
                    await this.page.fill(sel, value);
                }, selector);
                break;

            case 'press':
                await this.page.press(selector, value);
                break;

            case 'check':
                await this.healer.withHealing(async (sel) => {
                    await this.page.check(sel);
                }, selector);
                break;

            case 'uncheck':
                await this.healer.withHealing(async (sel) => {
                    await this.page.uncheck(sel);
                }, selector);
                break;

            case 'select':
                await this.healer.withHealing(async (sel) => {
                    await this.page.selectOption(sel, value);
                }, selector);
                break;

            case 'wait':
                if (typeof value === 'number') {
                    await this.page.waitForTimeout(value);
                } else {
                    await this.page.waitForSelector(selector);
                }
                break;

            case 'assert_visible':
                await this.healer.withHealing(async (sel) => {
                    const isVisible = await this.page.isVisible(sel);
                    if (!isVisible) throw new Error(`Assertion failed: Element ${sel} is not visible`);
                }, selector);
                break;

            case 'assert_text':
                await this.healer.withHealing(async (sel) => {
                    const text = await this.page.textContent(sel);
                    if (!text.includes(value)) {
                        throw new Error(`Assertion failed: Expected text "${value}" not found in "${text}"`);
                    }
                }, selector);
                break;

            default:
                throw new Error(`Unsupported UI action: ${action}`);
        }
    }
}

module.exports = { UIEngine };
