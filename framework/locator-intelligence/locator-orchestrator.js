const memoryStore = require('./locator-memory-store');
const ranker = require('./locator-ranker');
const classifier = require('./failure-classifier');
const VolatilityDetector = require('./dom-volatility-detector');
const WaitEngine = require('./wait-strategy-engine');
const BoundaryDetector = require('./component-boundary-detector');
const HealingEngine = require('./healing-engine');
const telemetry = require('./locator-telemetry-engine');
const ExecutionLayer = require('./execution-context-detector');
const { logger } = require('../../utils/base/logger');

/**
 * Locator Orchestrator (Odin Engine)
 * The central brain for smart locator resolution, ranking, and healing.
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
     * @param {string} locatorKey 
     * @param {Function} actionFn 
     * @param {import('@playwright/test').Locator} originalLocator 
     */
    async smartLocator(locatorKey, actionFn, originalLocator = null) {
        if (process.env.ENABLE_LIE !== 'true') {
            return originalLocator ? await actionFn(originalLocator) : null;
        }

        const startTime = Date.now();
        const context = await ExecutionLayer.detect(this.page);
        
        try {
            // 1. Adaptive Wait Strategy (Proactive)
            await this.waitEngine.apply('PROACTIVE');

            // 2. Resolve & Rank Candidates
            const candidates = await this._getRankedCandidates(locatorKey, context);
            
            // 3. Execution Loop
            for (const candidate of candidates) {
                const candidateStart = Date.now();
                try {
                    const locator = this._resolveLocator(candidate);
                    const result = await actionFn(locator);
                    
                    // Success: Learn & Telemetry
                    const duration = Date.now() - startTime;
                    await memoryStore.updateStats(locatorKey, candidate.strategy, true, duration);
                    
                    // Visual feedback for alternative resolution
                    if (candidate.strategy !== 'original') {
                        await this._highlight(locator, locatorKey);
                    }
                    telemetry.collect({
                        locatorKey,
                        strategy: candidate.strategy,
                        status: 'SUCCESS',
                        duration,
                        context
                    }).catch(() => {});

                    return result;
                } catch (err) {
                    const candidateDuration = Date.now() - candidateStart;
                    const failureType = classifier.classify(err);
                    
                    logger.warn(`[Orchestrator] Candidate ${candidate.strategy || 'unknown'} (${candidate.value || 'none'}) failed: ${failureType} in ${candidateDuration}ms. Error: ${err.message}`);

                    // Telemetry for failed candidate
                    telemetry.collect({
                        locatorKey,
                        strategy: candidate.strategy,
                        status: 'FAILURE',
                        failureType,
                        duration: candidateDuration,
                        context
                    }).catch(() => {});

                    // Adaptive recovery within loop: if blocked by overlay/hydration, wait before next candidate
                    if (['OVERLAY_BLOCKED', 'HYDRATION_PENDING', 'REACT_REPLACEMENT'].includes(failureType)) {
                        logger.info(`[Orchestrator] Applying corrective wait for ${failureType} before next candidate`);
                        await this.waitEngine.apply(failureType).catch(() => {});
                    }

                    continue;
                }
            }

            // 4. Default to original if provided and no candidates worked
            if (originalLocator) {
                return await this._executeWithTelemetry(locatorKey, 'original', originalLocator, actionFn, context);
            }

            throw new Error(`TIMEOUT: All candidates failed for ${locatorKey}`);

        } catch (error) {
            const duration = Date.now() - startTime;
            const failureType = classifier.classify(error);
            
            logger.warn(`[Orchestrator] Failure detected: ${failureType} on ${locatorKey}`);
            
            // Telemetry Capture
            telemetry.collect({
                locatorKey,
                status: 'FAILURE',
                failureType,
                duration,
                context
            }).catch(() => {});

            // ONLY HEAL if it's a locator-related failure
            const isHealable = ['LAZY_RENDER_PENDING', 'NOT_VISIBLE', 'DETACHED_NODE', 'OVERLAY_BLOCKED', 'SHADOW_ROOT_MISSING', 'REACT_REPLACEMENT'].includes(failureType);
            
            if (isHealable) {
                // DOM Volatility Check (Mutation Burst)
                const isVolatile = await this.volatility.detect();
                if (isVolatile) {
                    logger.warn(`[Orchestrator] High DOM volatility detected during failure of ${locatorKey}`);
                    await this.waitEngine.apply('TRANSITION_ACTIVE');
                }

                // Healing Pipeline
                const rescueResult = await this.healing.attemptRescue(locatorKey, originalLocator);
                if (rescueResult) {
                    // Success: Learn & Telemetry for healed locator
                    const result = await actionFn(rescueResult.locator);
                    await memoryStore.updateStats(locatorKey, rescueResult.strategy, true, Date.now() - startTime);
                    return result;
                }
            }

            throw error; // Rethrow if not healable or healing failed
        }
    }

    async _getRankedCandidates(locatorKey, context) {
        let candidates = await memoryStore.getCandidates(locatorKey);

        // Defensive cleanup: telemetry can write malformed rows (e.g., strategy undefined/null).
        // Those rows cannot be resolved into a usable Playwright locator.
        candidates = (candidates || []).filter(c => {
            if (!c) return false;
            if (!c.strategy || typeof c.strategy !== 'string') return false;

            // 'original' is an execution path, not a resolvable alternative candidate.
            // (We already have the original locator passed into smartLocator.)
            if (c.strategy === 'original') return false;

            // If we don't have a selector payload, there's nothing to resolve.
            // For memory rows, dom_signature is the best available payload.
            if (!c.dom_signature) return false;

            return true;
        });
        
        // Seed Truth Fallback
        if (candidates.length === 0) {
            const mapRegistry = require('./locator-map-registry');
            const seeds = await mapRegistry.getAlternatives(locatorKey);
            if (seeds.length > 0) {
                logger.info(`[Orchestrator] 🗺️ Seeding from Map Registry for ${locatorKey}`);
                candidates = seeds.map(s => ({ ...s, success_rate: 1.0, confidence: 1.0 }));
            }
        }

        if (candidates.length === 0) {
            logger.info(`[Orchestrator] No candidates found for ${locatorKey}; falling back to original locator if provided.`);
            return [];
        }

        return ranker.rank(candidates, context);
    }

    async _executeWithTelemetry(locatorKey, strategy, locator, actionFn, context) {
        const start = Date.now();
        try {
            const result = await actionFn(locator);
            const duration = Date.now() - start;
            
            telemetry.collect({
                locatorKey,
                strategy,
                status: 'SUCCESS',
                duration,
                context
            }).catch(() => {});
            
            return result;
        } catch (e) {
            const duration = Date.now() - start;
            const failureType = classifier.classify(e);
            telemetry.collect({
                locatorKey,
                strategy,
                status: 'FAILURE',
                failureType,
                duration,
                context
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

    async _highlight(locator, locatorKey) {
        if (!locator) return;
        try {
            await locator.evaluate((el, key) => {
                if (el) {
                    el.setAttribute('data-smart-loc-healed', 'true');
                    el.style.outline = '3px solid #ff00ff'; // Magenta
                    el.style.outlineOffset = '2px';
                    el.title = `Resolved via LIE: ${key}`;
                }
            }, locatorKey).catch(() => {});
            logger.info(`[Orchestrator] Applied highlighting to: ${locatorKey}`);
        } catch (e) {
            // Silently ignore
        }
    }
}

module.exports = LocatorOrchestrator;
