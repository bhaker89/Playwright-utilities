const { logger } = require('../../utils/base/logger');
const AdaptiveWaitContext = require('./adaptive-wait-context');

/**
 * Adaptive Wait Strategy Engine
 * Chooses the best wait strategy based on the failure type and DOM state.
 */
class WaitStrategyEngine {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    /**
     * Execute the best wait strategy for a given failure type.
     * @param {string} failureType - Classified by FailureClassifier
     */
    async apply(failureType) {
        if (!failureType) return;

        logger.info(`[WaitEngine] Applying strategy for: ${failureType}`);

        const context = await AdaptiveWaitContext.detect(this.page);

        // Standard Adaptive logic from Framework 2
        if (context.hasOverlay && failureType === 'OVERLAY_BLOCKED') {
            await this.waitForOverlayDismiss();
        }

        if (context.hasReact && (failureType === 'LAZY_RENDER_PENDING' || failureType === 'REACT_REPLACEMENT')) {
            await this.page.waitForLoadState('networkidle');
        }

        switch (failureType) {
            case 'PROACTIVE':
                // Proactive wait: Check for overlays and framework state without hard delays
                if (context.hasOverlay) await this.waitForOverlayDismiss().catch(() => {});
                if (context.hasReact && context.isLoading) await this.page.waitForLoadState('networkidle').catch(() => {});
                break;
            case 'HYDRATION_PENDING':
            case 'REACT_REPLACEMENT':
                await this.waitForHydration();
                break;
            case 'TRANSITION_ACTIVE':
                await this.waitForAnimations();
                break;
            case 'OVERLAY_BLOCKED':
                await this.waitForOverlayDismiss();
                break;
            case 'DETACHED_NODE':
            case 'NOT_VISIBLE':
                await this.waitForMutationStability();
                break;
            case 'SHADOW_ROOT_MISSING':
                await this.waitForShadowDomAttach();
                break;
            case 'TIMEOUT':
                await this.page.waitForLoadState('networkidle');
                break;
            default:
                // No-op for unknown types to avoid performance drag, 
                // but log if it's unexpected
                if (failureType) logger.info(`[WaitEngine] No specific strategy for ${failureType}`);
        }
    }

    async waitForHydration() {
        await this.page.evaluate(async () => {
            const delay = (ms) => new Promise(r => setTimeout(r, ms));
            // Wait for window.__NEXT_DATA__ to be processed if using Next.js
            for (let i = 0; i < 20; i++) {
                if (window.next && window.next.router) break;
                await delay(250);
            }
        });
    }

    async waitForAnimations() {
        await this.page.evaluate(async () => {
            const delay = (ms) => new Promise(r => setTimeout(r, ms));
            await delay(500); // Static wait for animation to likely finish
        });
    }

    async waitForMutationStability() {
        await this.page.evaluate(async () => {
            return new Promise((resolve) => {
                let timer;
                const observer = new MutationObserver(() => {
                    clearTimeout(timer);
                    timer = setTimeout(resolve, 500); // Resolve after 500ms of no mutations
                });
                observer.observe(document.body, { childList: true, subtree: true });
                timer = setTimeout(resolve, 3000); // Safety timeout
            });
        });
    }

    async waitForOverlayDismiss() {
        const overlaySelectors = [
            '[role="dialog"]',
            '[aria-modal="true"]',
            '.modal-open', // This will also catch .modal-open on body/html
            '.backdrop',
            '.modal-backdrop',
            '.overlay'
        ];
        
        for (const selector of overlaySelectors) {
            try {
                const locator = this.page.locator(selector);
                const isVisible = await locator.isVisible();
                if (isVisible) {
                    logger.info(`[WaitEngine] Waiting for overlay dismissal: ${selector}`);
                    // Wait for either hidden OR detached (removed from DOM)
                    await Promise.race([
                        locator.waitFor({ state: 'hidden', timeout: 5000 }).then(() => logger.info(`[WaitEngine] Overlay ${selector} became hidden.`)),
                        locator.waitFor({ state: 'detached', timeout: 5000 }).then(() => logger.info(`[WaitEngine] Overlay ${selector} became detached.`))
                    ]);
                }
            } catch (e) {
                // Ignore if selector not found or timeout
            }
        }
    }

    async waitForShadowDomAttach() {
        logger.info(`[WaitEngine] Scanning for Shadow Root attachment...`);
        try {
            // Adaptive wait: Scans the top layer of DOM for any element that has an attached shadowRoot
            await this.page.waitForFunction(() => {
                const elements = Array.from(document.querySelectorAll('*')).slice(0, 100); // Limit elements to scan for performance
                return elements.some(el => !!el.shadowRoot);
            }, { timeout: 5000 });
            logger.info(`[WaitEngine] Shadow Root detected.`);
        } catch (e) {
            logger.warn(`[WaitEngine] Shadow Root attachment wait timed out.`);
        }
    }
}

module.exports = WaitStrategyEngine;
