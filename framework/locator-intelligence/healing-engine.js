const memoryStore = require('./locator-memory-store');
const ranker = require('./locator-ranker');
const { logger } = require('../../utils/base/logger');

/**
 * Enhanced Healing Engine
 * Orchestrates the Playwright-native hierarchy: testId > role > label > text > css > xpath > AI
 */
class HealingEngine {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} pageName
     */
    constructor(page, pageName = 'Global') {
        this.page = page;
        this.pageName = pageName;
        this.hierarchy = [
            'getByTestId',
            'getByRole',
            'getByLabel',
            'getByPlaceholder',
            'getByText',
            'css',
            'xpath'
        ];
    }

    /**
     * Attempt rescue via alternative strategies stored in map registry or inferred.
     */
    async attemptRescue(locatorKey, originalLocator) {
        logger.warn(`[HealingEngine] Initiating rescue for: ${locatorKey}`);

        // 1. Check legacy ComponentRegistry (for existing tests)
        const componentRegistry = require('../../platform/core/component-registry');
        const registered = componentRegistry.get(this.pageName, locatorKey);
        if (registered && registered.selector) {
            const registeredLocator = this.page.locator(registered.selector).first();
            if (await registeredLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
                logger.info(`[HealingEngine] ✨ Found cached fix in ComponentRegistry: ${registered.selector}`);
                return { locator: registeredLocator, strategy: 'registry' };
            }
        }

        // 2. Check new Map Registry
        const mapRegistry = require('./locator-map-registry');
        const alternatives = await mapRegistry.getAlternatives(locatorKey);

        for (const alt of alternatives) {
            const locator = this._createLocator(alt.strategy, alt.value);
            if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) {
                logger.info(`[HealingEngine] ✨ Found alternative via ${alt.strategy}: ${alt.value}`);
                return { locator, strategy: alt.strategy };
            }
        }

        // 3. Stage 2: Fuzzy Text matching (Legacy Stage 2)
        if (locatorKey) {
            const fuzzyLocator = this.page.locator(`text="${locatorKey}"`).first();
            if (await fuzzyLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
                logger.info(`[HealingEngine] 🧭 Stage 2 Success: Element found via fuzzy text: ${locatorKey}`);
                // Save to legacy registry for backward compatibility
                componentRegistry.register(this.pageName, locatorKey, { selector: `text="${locatorKey}"` });
                return { locator: fuzzyLocator, strategy: 'getByText' };
            }
        }

        // 4. Fallback to AI if all else fails
        if (process.env.ENABLE_AI_HEALING === 'true') {
            logger.warn(`[HealingEngine] 🧠 Attempting AI Rescue for: ${locatorKey}`);
            const aiEngine = require('../../platform/core/ai-engine');
            const html = await this.page.content();
            const suggestedSelector = await aiEngine.healLocator(originalLocator.toString(), 'Locator failed during interaction', html);

            if (suggestedSelector) {
                const aiLocator = this.page.locator(suggestedSelector).first();
                if (await aiLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
                    logger.info(`[HealingEngine] 🧠 AI Rescue Success: ${suggestedSelector}`);
                    return { locator: aiLocator, strategy: 'ai' };
                }
            }
        } else {
            logger.info(`[HealingEngine] 🚫 AI Healing is disabled (ENABLE_AI_HEALING !== 'true').`);
        }

        return null;
    }

    _createLocator(strategy, value) {
        switch (strategy) {
            case 'getByTestId': return this.page.getByTestId(value);
            case 'getByRole': return this.page.getByRole(value.role, value.options);
            case 'getByLabel': return this.page.getByLabel(value);
            case 'getByPlaceholder': return this.page.getByPlaceholder(value);
            case 'getByText': return this.page.getByText(value);
            case 'css': return this.page.locator(value);
            case 'xpath': return this.page.locator(`xpath=${value}`);
            default: return this.page.locator(value);
        }
    }
}

module.exports = HealingEngine;
