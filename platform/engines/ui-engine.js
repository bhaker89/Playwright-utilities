const { logger } = require('../../utils/base/logger');
const { SmartLocator } = require('../core/smart-locator');

/**
 * Executes UI test steps from YAML definitions.
 *
 * NOTE: Legacy SelfHealer has been removed; YAML execution now routes healing
 * through SmartLocator (LIE bridge) when ENABLE_LIE=true.
 */
class UIEngine {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} pageName
     */
    constructor(page, pageName = 'UIEngine') {
        this.page = page;
        this.pageName = pageName;
        this.healer = new SmartLocator(page, pageName);
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
        const { action, selector, value, url, element } = step;
        logger.info(`UI: Executing action "${action}" ${selector ? `on "${selector}"` : ''}`);

        // Best-effort friendly name for telemetry/memory keys.
        const elementName = element || selector || action;

        switch (action) {
            case 'goto':
            case 'navigate':
                await this.page.goto(url);
                break;

            case 'click': {
                const originalLocator = this.page.locator(selector);
                await this.healer.executeWithHealing(elementName, originalLocator, async (loc) => {
                    await loc.click();
                });
                break;
            }

            case 'fill':
            case 'type': {
                const originalLocator = this.page.locator(selector);
                await this.healer.executeWithHealing(elementName, originalLocator, async (loc) => {
                    await loc.fill(value);
                });
                break;
            }

            case 'press':
                await this.page.press(selector, value);
                break;

            case 'check': {
                const originalLocator = this.page.locator(selector);
                await this.healer.executeWithHealing(elementName, originalLocator, async (loc) => {
                    await loc.check();
                });
                break;
            }

            case 'uncheck': {
                const originalLocator = this.page.locator(selector);
                await this.healer.executeWithHealing(elementName, originalLocator, async (loc) => {
                    await loc.uncheck();
                });
                break;
            }

            case 'select': {
                const originalLocator = this.page.locator(selector);
                await this.healer.executeWithHealing(elementName, originalLocator, async (loc) => {
                    await loc.selectOption(value);
                });
                break;
            }

            case 'wait':
                if (typeof value === 'number') {
                    await this.page.waitForTimeout(value);
                } else {
                    await this.page.waitForSelector(selector);
                }
                break;

            case 'assert_visible': {
                const originalLocator = this.page.locator(selector);
                await this.healer.executeWithHealing(elementName, originalLocator, async (loc) => {
                    const isVisible = await loc.isVisible();
                    if (!isVisible) throw new Error(`Assertion failed: Element ${selector} is not visible`);
                });
                break;
            }

            case 'assert_text': {
                const originalLocator = this.page.locator(selector);
                await this.healer.executeWithHealing(elementName, originalLocator, async (loc) => {
                    const text = await loc.textContent();
                    if (!String(text || '').includes(value)) {
                        throw new Error(`Assertion failed: Expected text "${value}" not found in "${text}"`);
                    }
                });
                break;
            }

            default:
                throw new Error(`Unsupported UI action: ${action}`);
        }
    }
}

module.exports = { UIEngine };
