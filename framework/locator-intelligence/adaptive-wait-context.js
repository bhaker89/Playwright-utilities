/**
 * Adaptive Wait Context
 * Detects frontend framework states and DOM patterns for smart waiting.
 */
class AdaptiveWaitContext {
    /**
     * Detect the execution context of the page.
     * @param {import('@playwright/test').Page} page 
     * @returns {Promise<Object>} Context metadata
     */
    static async detect(page) {
        return await page.evaluate(() => {
            return {
                hasReact: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
                hasNextJS: !!window.__NEXT_DATA__,
                hasShadowRoot: !!Array.from(document.querySelectorAll('*')).slice(0, 200).find(el => !!el.shadowRoot),
                hasOverlay: !!(
                    document.querySelector('[role="dialog"]') || 
                    document.querySelector('.modal-open') || 
                    document.querySelector('.backdrop') ||
                    document.querySelector('[aria-modal="true"]')
                ),
                isHydrating: !!document.querySelector('[data-nextjs-hydration]'),
                isLoading: document.readyState !== 'complete'
            };
        });
    }
}

module.exports = AdaptiveWaitContext;
