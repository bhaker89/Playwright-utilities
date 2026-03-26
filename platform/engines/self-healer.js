const { logger } = require('../../utils/base/logger');
const aiEngine = require('../core/ai-engine');

/**
 * Handles self-healing of broken UI locators during test execution
 */
class SelfHealer {
    /**
     * @param {import('@playwright/test').Page} page 
     */
    constructor(page) {
        this.page = page;
    }

    /**
     * Attempt to perform an action with self-healing capabilities
     * @param {Function} actionCallback - Async function performing the PW action
     * @param {string} selector - The original selector used
     * @returns {Promise<any>} Result of the action
     */
    async withHealing(actionCallback, selector) {
        try {
            // First try: Normal execution
            return await actionCallback(selector);
        } catch (error) {
            if (this._isSelectorError(error)) {
                logger.warn(`Locator failed: "${selector}". Initiating Self-Healing...`);

                const healedSelector = await this._heal(selector, error);

                if (healedSelector) {
                    logger.info(`✨ HEALED: Retrying with new selector: "${healedSelector}"`);

                    // Visualize the fix in the browser
                    await this._highlightHealedElement(healedSelector);

                    // Retry with new selector
                    return await actionCallback(healedSelector);
                }
            }
            throw error;
        }
    }

    /**
     * @private
     */
    async _heal(selector, error) {
        try {
            const pageContent = await this.page.content();
            const newSelector = await aiEngine.healLocator(selector, error.message, pageContent);
            return newSelector;
        } catch (e) {
            logger.error('Self-healing process failed', e);
            return null;
        }
    }

    /**
     * @private
     */
    _isSelectorError(error) {
        return error.name === 'TimeoutError' ||
            error.message.includes('waiting for selector') ||
            error.message.includes('Element not found');
    }

    /**
     * @private
     */
    async _highlightHealedElement(selector) {
        try {
            const locator = this.page.locator(selector);
            await locator.evaluate(el => {
                el.style.border = '3px solid #00ff00'; // Green border
                el.style.boxShadow = '0 0 10px #00ff00';
                el.setAttribute('data-healed', 'true');
            });
        } catch (e) {
            // Ignore highlighting errors
        }
    }
}

module.exports = { SelfHealer };
