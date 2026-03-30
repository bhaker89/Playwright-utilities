/**
 * Execution Context Detector
 * Monitors the execution layer for structural changes and framework state.
 */
class ExecutionContextDetector {
    /**
     * Detect the execution layer metadata.
     * @param {import('@playwright/test').Page} page 
     * @returns {Promise<Object>} Layer metadata
     */
    static async detect(page) {
        return await page.evaluate(() => {
            const allElements = document.querySelectorAll('*');
            let shadowRootCount = 0;
            allElements.forEach(el => {
                if (el.shadowRoot) shadowRootCount++;
            });

            return {
                frameCount: window.frames.length,
                shadowRootCount: shadowRootCount,
                reactDetected: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
                timestamp: Date.now(),
                url: window.location.href,
                title: document.title
            };
        });
    }
}

module.exports = ExecutionContextDetector;
