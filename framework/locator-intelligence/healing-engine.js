const { logger } = require('../../utils/base/logger');

/**
 * HealingEngine
 * LIE-native rescue path.
 *
 * Legacy 3-stage healing (ComponentRegistry cache, fuzzy text, AI rewrite) has been removed.
 */
class HealingEngine {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} pageName
     */
    constructor(page, pageName = 'Global') {
        this.page = page;
        this.pageName = pageName;
    }

    /**
     * Attempt rescue via LIE's alternative candidates.
     *
     * @param {string} locatorKey
     * @param {import('@playwright/test').Locator | null} originalLocator
     */
    async attemptRescue(locatorKey, originalLocator) {
        logger.warn(`[HealingEngine] Initiating rescue for: ${locatorKey}`);

        // LIE-native registry of alternatives.
        const mapRegistry = require('./locator-map-registry');
        const alternatives = await mapRegistry.getAlternatives(locatorKey);

        for (const alt of alternatives) {
            if (!alt || !alt.strategy || !alt.value) continue;

            const locator = this._createLocator(alt.strategy, alt.value);
            const isVisible = await locator.isVisible({ timeout: 2000 }).catch(() => false);
            if (isVisible) {
                logger.info(`[HealingEngine] Found alternative via ${alt.strategy}: ${typeof alt.value === 'string' ? alt.value : '[object]'}`);
                await this._highlight(locator, locatorKey);
                return { locator, strategy: alt.strategy };
            }
        }

        // No rescue found. The orchestrator/bridge will fall back to the original locator.
        return null;
    }

    async _highlight(locator, locatorKey) {
        if (!locator) return;
        try {
            await locator.evaluate((el, key) => {
                if (el) {
                    el.setAttribute('data-smart-loc-healed', 'true');
                    el.style.outline = '3px solid #ff00ff';
                    el.style.outlineOffset = '2px';
                    el.title = `Healed: ${key}`;
                }
            }, locatorKey).catch(() => {});
            logger.info(`[HealingEngine] Applied highlighting to: ${locatorKey}`);
        } catch (e) {
            // Silently ignore
        }
    }

    _createLocator(strategy, value) {
        switch (strategy) {
            case 'getByTestId':
                return this.page.getByTestId(value);
            case 'getByRole':
                // Support both { role, options } and Playwright's (role, options)
                return this.page.getByRole(value.role, value.options);
            case 'getByLabel':
                return this.page.getByLabel(value);
            case 'getByPlaceholder':
                return this.page.getByPlaceholder(value);
            case 'getByText':
                return this.page.getByText(value);
            case 'css':
                return this.page.locator(value);
            case 'xpath':
                return this.page.locator(`xpath=${value}`);
            default:
                return this.page.locator(value);
        }
    }
}

module.exports = HealingEngine;
