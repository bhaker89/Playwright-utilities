const { logger } = require('../../utils/base/logger');
const componentRegistry = require('./component-registry');
const aiEngine = require('./ai-engine');
const { getReporterInstance } = require('./healing-reporter');

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
        const healingStartTime = Date.now();

        // ---------------------------------------------------------
        // STAGE 1: The Registry Check
        // Check if another test already encountered and fixed this.
        // ---------------------------------------------------------
        logger.info(`[SmartLocator] 🔍 Stage 1: Checking ComponentRegistry for cached fixes...`);
        const stage1StartTime = Date.now();
        const registeredMeta = componentRegistry.get(this.pageName, elementName);

        if (registeredMeta && registeredMeta.selector && registeredMeta.selector !== failedLocatorStr) {
            logger.info(`[SmartLocator] ✨ Stage 1 Success: Found updated selector in registry: ${registeredMeta.selector}`);
            
            // Track healing event
            this._trackHealingEvent({
                elementName,
                originalSelector: failedLocatorStr,
                stage: 1,
                success: true,
                newSelector: registeredMeta.selector,
                duration: Date.now() - stage1StartTime,
                error: error.message
            });
            
            return this.page.locator(registeredMeta.selector);
        }

        // Track Stage 1 failure
        this._trackHealingEvent({
            elementName,
            originalSelector: failedLocatorStr,
            stage: 1,
            success: false,
            newSelector: null,
            duration: Date.now() - stage1StartTime,
            error: error.message
        });

        // ---------------------------------------------------------
        // STAGE 2: Fuzzy DOM Traversal
        // Fallback to lightweight, text-based semantic matching.
        // ---------------------------------------------------------
        logger.info(`[SmartLocator] 🧭 Stage 2: Attempting internal fuzzy matching fallback...`);
        const stage2StartTime = Date.now();
        
        // If it was a strict ByRole check, let's just look for the text anywhere on the screen
        if (elementName) {
            const fuzzyLocator = this.page.locator(`text="${elementName}"`).first();
            // Quick check if this fuzzy match is visible
            if (await fuzzyLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
                logger.info(`[SmartLocator] ✨ Stage 2 Success: Element found via fuzzy text matching.`);
                
                const newSelector = `text="${elementName}"`;
                
                // Track healing event
                this._trackHealingEvent({
                    elementName,
                    originalSelector: failedLocatorStr,
                    stage: 2,
                    success: true,
                    newSelector,
                    duration: Date.now() - stage2StartTime,
                    error: error.message
                });
                
                // Persist the find to Registry
                componentRegistry.register(this.pageName, elementName, { selector: newSelector });
                return fuzzyLocator;
            }
        }
        
        // Track Stage 2 failure
        this._trackHealingEvent({
            elementName,
            originalSelector: failedLocatorStr,
            stage: 2,
            success: false,
            newSelector: null,
            duration: Date.now() - stage2StartTime,
            error: error.message
        });

        // ---------------------------------------------------------
        // STAGE 3: LLM Rescue Operations
        // Extract a DOM snapshot and let AI infer the new selector.
        // ---------------------------------------------------------
        logger.info(`[SmartLocator] 🧠 Stage 3: Escalating to LLM AiEngine rescue...`);
        const stage3StartTime = Date.now();
        const pageHTML = await this.page.content();
        const newSelector = await aiEngine.healLocator(failedLocatorStr, error.message, pageHTML);

        if (newSelector) {
            const newLocator = this.page.locator(newSelector).first();

            // Verify the AI's suggestion actually exists
            if (await newLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
                logger.info(`[SmartLocator] ✨ Stage 3 Success: LLM provided valid selector: ${newSelector}`);
                
                // Track healing event
                this._trackHealingEvent({
                    elementName,
                    originalSelector: failedLocatorStr,
                    stage: 3,
                    success: true,
                    newSelector,
                    duration: Date.now() - stage3StartTime,
                    error: error.message
                });
                
                await this._highlight(newLocator);

                // Persist to Registry so Stage 1 catches it next time
                componentRegistry.register(this.pageName, elementName, { selector: newSelector });
                return newLocator;
            } else {
                logger.error(`[SmartLocator] ❌ Stage 3 Failed: LLM suggestion was not visible on the DOM.`);
                
                // Track Stage 3 failure
                this._trackHealingEvent({
                    elementName,
                    originalSelector: failedLocatorStr,
                    stage: 3,
                    success: false,
                    newSelector,
                    duration: Date.now() - stage3StartTime,
                    error: `LLM suggestion not visible: ${newSelector}`
                });
            }
        } else {
            // Track Stage 3 failure (no selector returned)
            this._trackHealingEvent({
                elementName,
                originalSelector: failedLocatorStr,
                stage: 3,
                success: false,
                newSelector: null,
                duration: Date.now() - stage3StartTime,
                error: 'LLM returned NULL'
            });
        }

        return null; // Healing completely failed
    }

    _isHealableError(error) {
        // Broaden the net: If Playwright throws an error during an interaction (click/fill)
        // on a locator, 99% of the time it is because the element could not be found, 
        // was obscured, or timed out.
        const msg = error.message || '';
        return msg.includes('Timeout') ||
            msg.includes('waiting for locator') ||
            msg.includes('Target closed') ||
            error.name === 'TimeoutError';
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

    /**
     * Track healing event for analytics
     * @private
     */
    _trackHealingEvent(eventData) {
        try {
            const reporter = getReporterInstance();
            if (reporter && typeof reporter.trackHealingAttempt === 'function') {
                reporter.trackHealingAttempt({
                    testName: process.env.PLAYWRIGHT_TEST_NAME || 'Unknown Test',
                    pageName: this.pageName,
                    ...eventData
                });
            }
        } catch (error) {
            // Silently fail if reporter is not available
            logger.debug('[SmartLocator] Reporter not available for tracking');
        }
    }
}

module.exports = { SmartLocator };
