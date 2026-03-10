const { logger } = require('../../utils/base/logger');
const componentRegistry = require('./component-registry');
const aiEngine = require('./ai-engine');

/**
 * SmartLocator
 * 3-Stage Self-Healing Engine for UI Interactions.
 * Intercepts Playwright Locator timeouts and attempts rescue operations.
 */
class SmartLocator {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} pageName - The name of the Page Object class (e.g., 'LoginPage')
     */
    constructor(page, pageName) {
        this.page = page;
        this.pageName = pageName;
    }

    /**
     * Executes an action with seamless self-healing fallback.
     * @param {string} elementName - The logical name of the element (e.g., 'Login Button')
     * @param {import('@playwright/test').Locator} originalLocator - The initial Playwright locator
     * @param {Function} actionFn - Async callback for the action, e.g., async (loc) => await loc.click()
     */
    async executeWithHealing(elementName, originalLocator, actionFn) {
        try {
            // Fast Path: Try the original locator first
            return await actionFn(originalLocator);
        } catch (error) {
            // Log the error to see what we are dealing with
            logger.debug(`[SmartLocator] Caught error: ${error.name} - ${error.message}`);

            // Only attempt healing for Timeout errors where an element couldn't be found
            if (this._isHealableError(error)) {
                logger.warn(`[SmartLocator] ⚠️ Timeout on "${elementName}". Initiating 3-Stage Rescue...`);

                const healedLocator = await this._heal(elementName, originalLocator, error);

                if (healedLocator) {
                    logger.info(`[SmartLocator] 🎯 HEALED: Retrying action on "${elementName}"`);
                    return await actionFn(healedLocator);
                }
            }
            // Rethrow if healing fails or the error is unrelated (e.g. navigation error)
            throw error;
        }
    }

    async _heal(elementName, failedLocator, error) {
        const failedLocatorStr = failedLocator.toString();

        // ---------------------------------------------------------
        // STAGE 1: The Registry Check
        // Check if another test already encountered and fixed this.
        // ---------------------------------------------------------
        logger.info(`[SmartLocator] 🔍 Stage 1: Checking ComponentRegistry for cached fixes...`);
        const registeredMeta = componentRegistry.get(this.pageName, elementName);

        if (registeredMeta && registeredMeta.selector && registeredMeta.selector !== failedLocatorStr) {
            logger.info(`[SmartLocator] ✨ Stage 1 Success: Found updated selector in registry: ${registeredMeta.selector}`);
            return this.page.locator(registeredMeta.selector);
        }

        // ---------------------------------------------------------
        // STAGE 2: Fuzzy DOM Traversal
        // Fallback to lightweight, text-based semantic matching.
        // ---------------------------------------------------------
        logger.info(`[SmartLocator] 🧭 Stage 2: Attempting internal fuzzy matching fallback...`);
        // If it was a strict ByRole check, let's just look for the text anywhere on the screen
        if (elementName) {
            const fuzzyLocator = this.page.locator(`text="${elementName}"`).first();
            // Quick check if this fuzzy match is visible
            if (await fuzzyLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
                logger.info(`[SmartLocator] ✨ Stage 2 Success: Element found via fuzzy text matching.`);
                // Persist the find to Registry
                componentRegistry.register(this.pageName, elementName, { selector: `text="${elementName}"` });
                return fuzzyLocator;
            }
        }

        // ---------------------------------------------------------
        // STAGE 3: LLM Rescue Operations
        // Extract a DOM snapshot and let AI infer the new selector.
        // ---------------------------------------------------------
        logger.info(`[SmartLocator] 🧠 Stage 3: Escalating to LLM AiEngine rescue...`);
        const pageHTML = await this.page.content();
        const newSelector = await aiEngine.healLocator(failedLocatorStr, error.message, pageHTML);

        if (newSelector) {
            const newLocator = this.page.locator(newSelector).first();

            // Verify the AI's suggestion actually exists
            if (await newLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
                logger.info(`[SmartLocator] ✨ Stage 3 Success: LLM provided valid selector: ${newSelector}`);
                await this._highlight(newLocator);

                // Persist to Registry so Stage 1 catches it next time
                componentRegistry.register(this.pageName, elementName, { selector: newSelector });
                return newLocator;
            } else {
                logger.error(`[SmartLocator] ❌ Stage 3 Failed: LLM suggestion was not visible on the DOM.`);
            }
        }

        return null; // Healing completely failed
    }

    _isHealableError(error) {
        return error.name === 'TimeoutError' || error.message.includes('waiting for locator');
    }

    async _highlight(locator) {
        try {
            await locator.evaluate((node) => {
                node.style.border = '3px solid #ff00ff';
                node.style.boxShadow = '0 0 15px #ff00ff';
                node.setAttribute('data-smart-loc-healed', 'true');
            });
        } catch (e) {
            // Ignore evaluation errors during highlight
        }
    }
}

module.exports = { SmartLocator };
