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
        switch (failureType) {
            case 'HYDRATION_PENDING':
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
                await this.page.waitForTimeout(1000); // Minimal fallback wait
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
         // This would ideally interact with specific overlay selectors provided by environment context
         await this.page.waitForTimeout(1000); 
    }

    async waitForShadowDomAttach() {
        await this.page.waitForTimeout(1000); // Standard wait for shadow roots to attach
    }
}

module.exports = WaitStrategyEngine;
