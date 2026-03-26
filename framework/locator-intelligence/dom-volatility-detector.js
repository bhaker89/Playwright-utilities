/**
 * DOM Volatility Detector
 * Detects page state issues like React hydration, mutation bursts, and animations.
 */
class DOMVolatilityDetector {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    async detect() {
        return await this.page.evaluate(() => {
            const indicators = {
                isReact: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
                isNext: !!window.__NEXT_DATA__,
                isHydrated: false,
                mutationBurst: window._lie_mutation_burst || false,
                hasShadowDom: false,
                activeAnimations: 0
            };

            // Check if Next.js hydration is complete
            if (indicators.isNext) {
                indicators.isHydrated = !!(window.next && window.next.router);
            }

            // More efficient Shadow DOM detection
            indicators.hasShadowDom = !!document.querySelector('*')?.shadowRoot;

            // PERFORMANCE: Use document.getAnimations() if available, or a limited check
            if (document.getAnimations) {
                indicators.activeAnimations = document.getAnimations().filter(a => a.playState === 'running').length;
            } else {
                // Fallback to a very light check for common animation classes or limited elements
                const commonContainers = document.querySelectorAll('div, section, main');
                for (let i = 0; i < Math.min(commonContainers.length, 50); i++) {
                    const style = window.getComputedStyle(commonContainers[i]);
                    if (style.animationPlayState === 'running') indicators.activeAnimations++;
                    if (indicators.activeAnimations > 5) break;
                }
            }

            return indicators;
        });
    }

    /**
     * Advanced: Monitor mutation frequency for a short period
     * @param {number} durationMs 
     */
    async detectMutationBurst(durationMs = 500) {
        return await this.page.evaluate((duration) => {
            return new Promise((resolve) => {
                let count = 0;
                const observer = new MutationObserver(() => count++);
                observer.observe(document.body, { childList: true, subtree: true, attributes: true });
                
                setTimeout(() => {
                    observer.disconnect();
                    const burst = count > 10;
                    window._lie_mutation_burst = burst; // Cache for next detect() call
                    resolve(burst);
                }, duration);
            });
        }, durationMs);
    }
}

module.exports = DOMVolatilityDetector;
