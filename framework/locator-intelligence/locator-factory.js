const LocatorOrchestrator = require('./locator-orchestrator');

/**
 * Locator Factory Middleware
 * Decouples BasePage from the specific implementation of LIE.
 */
class LocatorFactory {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} pageName
     */
    constructor(page, pageName = 'Global') {
        this.orchestrator = new LocatorOrchestrator(page, pageName);
    }

    /**
     * Create a smart locator that goes through the intelligence pipeline.
     */
    async create(locatorKey, actionFn, originalLocator = null) {
        return await this.orchestrator.smartLocator(locatorKey, actionFn, originalLocator);
    }
}

module.exports = LocatorFactory;
