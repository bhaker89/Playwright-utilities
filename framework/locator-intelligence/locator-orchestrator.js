const memoryStore = require('./locator-memory-store');
const ranker = require('./locator-ranker');
const classifier = require('./failure-classifier');
const VolatilityDetector = require('./dom-volatility-detector');
const WaitEngine = require('./wait-strategy-engine');
const BoundaryDetector = require('./component-boundary-detector');
const HealingEngine = require('./healing-engine');
const telemetry = require('./locator-telemetry-engine');
const { logger } = require('../../utils/base/logger');

/**
 * Locator Orchestrator (Core Brain)
 * Directs the entire LIE pipeline.
 */
class LocatorOrchestrator {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} pageName - Optional page name for legacy compatibility
     */
    constructor(page, pageName = 'Global') {
        this.page = page;
        this.pageName = pageName;
        this.volatility = new VolatilityDetector(page);
        this.waitEngine = new WaitEngine(page);
        this.boundary = new BoundaryDetector(page);
        this.healing = new HealingEngine(page, pageName);
    }

    /**
     * Smart Locator Execution Pipeline
     */
    async smartLocator(locatorKey, actionFn, originalLocator = null) {
        const startTime = Date.now();
        let currentLocator = originalLocator;
        let currentStrategy = originalLocator ? 'original' : 'unknown';

        const isLieEnabled = process.env.ENABLE_LIE !== 'false';
        
        if (!isLieEnabled && originalLocator) {
            return await actionFn(originalLocator);
        }

        try {
            // 1. Primary Strategy Discovery: Memory vs Map (Seed Truth)
            if (!originalLocator || currentStrategy === 'unknown') {
                let candidates = await memoryStore.getCandidates(locatorKey);
                
                // If memory is empty, consult the versioned Map Registry (Seed Truth)
                if (candidates.length === 0) {
                    const mapRegistry = require('./locator-map-registry');
                    const seeds = await mapRegistry.getAlternatives(locatorKey);
                    if (seeds.length > 0) {
                        logger.info(`[Orchestrator] 🗺️ Seeding from Map Registry for ${locatorKey}`);
                        candidates = seeds.map(s => ({ ...s, success_rate: 1.0, stability_score: 1.0 }));
                    }
                }

                const ranked = ranker.rank(candidates, await this.volatility.detect());
                if (ranked.length > 0) {
                    currentLocator = this._resolveLocator(ranked[0]);
                    currentStrategy = ranked[0].strategy;
                }
            }

            // Fallback to original if still nothing
            if (!currentLocator && originalLocator) {
                currentLocator = originalLocator;
                currentStrategy = 'original';
            }

            if (!currentLocator) {
                throw new Error(`[Orchestrator] No locator candidate found for: ${locatorKey}`);
            }

            // 2. Simple execution attempt
            return await this._executeWithTelemetry(locatorKey, currentStrategy, currentLocator, actionFn);

        } catch (error) {
            const failureType = classifier.classify(error);
            logger.warn(`[Orchestrator] Failure detected: ${failureType} on ${locatorKey}`);

            // 3. Detect Mutation Burst upon failure to capture transient state
            this.volatility.detectMutationBurst(500).then(burst => {
                if (burst) logger.warn(`[Orchestrator] 🧊 High DOM mutation burst detected during failure for ${locatorKey}`);
            }).catch(() => {});

            // 4. Adaptive Wait
            await this.waitEngine.apply(failureType);

            // 5. Healing Pipeline
            const rescueResult = await this.healing.attemptRescue(locatorKey, currentLocator || { toString: () => locatorKey });
            
            if (rescueResult) {
                const healedLocator = rescueResult.locator;
                // Discover boundary for future stability
                const boundary = await this.boundary.discoverBoundary(healedLocator);
                const optimizedLocator = await this.boundary.getScopedLocator(healedLocator, boundary);
                
                // Final attempt
                const result = await actionFn(optimizedLocator);
                
                // Track success via Telemetry
                const duration = Date.now() - startTime;
                await telemetry.collect({
                    locatorKey,
                    strategy: rescueResult.strategy,
                    status: 'SUCCESS',
                    duration,
                    failureType: 'HEALED'
                });
                return result;
            }

            throw error; // If healing fails
        }
    }

    async _executeWithTelemetry(locatorKey, strategy, locator, actionFn) {
        const start = Date.now();
        try {
            const result = await actionFn(locator);
            const duration = Date.now() - start;
            
            // Record telemetry (now async and buffered)
            telemetry.collect({
                locatorKey,
                strategy,
                status: 'SUCCESS',
                duration
            }).catch(() => {});
            
            return result;
        } catch (e) {
            const duration = Date.now() - start;
            telemetry.collect({
                locatorKey,
                strategy,
                status: 'FAILURE',
                duration,
                error: e.message
            }).catch(() => {});
            throw e;
        }
    }

    _resolveLocator(candidate) {
        const strategy = candidate.strategy;
        const value = candidate.value || candidate.dom_signature || candidate.locator_key;
        
        switch (strategy) {
            case 'getByTestId': return this.page.getByTestId(value);
            case 'getByRole': 
                return typeof value === 'object' 
                    ? this.page.getByRole(value.role, value.options)
                    : this.page.getByRole(value);
            case 'getByLabel': return this.page.getByLabel(value);
            case 'getByPlaceholder': return this.page.getByPlaceholder(value);
            case 'getByText': return this.page.getByText(value);
            case 'css': return this.page.locator(value);
            case 'xpath': return this.page.locator(`xpath=${value}`);
            default: return this.page.locator(value);
        }
    }
}

module.exports = LocatorOrchestrator;
