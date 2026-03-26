const LocatorFactory = require('../../framework/locator-intelligence/locator-factory');
const { logger } = require('../../utils/base/logger');

/**
 * SmartLocator (Legacy Bridge)
 * Wraps the new LIE LocatorFactory to provide backward compatibility for existing tests.
 */
class SmartLocator {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} pageName - The name of the Page Object class (e.g., 'LoginPage')
     */
    constructor(page, pageName) {
        this.page = page;
        this.pageName = pageName;
        this.factory = null;
        if (process.env.ENABLE_LIE === 'true') {
            const LocatorFactory = require('../../framework/locator-intelligence/locator-factory');
            this.factory = new LocatorFactory(page, pageName);
        }
    }

    /**
     * Executes an action with seamless self-healing fallback via LIE.
     */
    async executeWithHealing(elementName, originalLocator, actionFn) {
        if (!this.factory) {
            // Fallback to purely standard behavior if LIE is disabled
            // or perform a simple action if originalLocator provided
            if (originalLocator) {
                return await actionFn(originalLocator);
            }
            throw new Error(`[SmartLocator] LIE disabled and no originalLocator provided for ${elementName}`);
        }
        logger.info(`[LegacyBridge] Routing ${elementName} through LIE...`);
        return await this.factory.create(elementName, actionFn, originalLocator);
    }
}

module.exports = { SmartLocator };
