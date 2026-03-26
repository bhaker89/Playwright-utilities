/**
 * Component Boundary Detector
 * Scopes locators to semantic boundaries to increase stability.
 */
class ComponentBoundaryDetector {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    /**
     * Find the nearest semantic boundary for a successful locator.
     * @param {import('@playwright/test').Locator} locator 
     */
    async discoverBoundary(locator) {
        return await locator.evaluate((node) => {
            const selectors = [
                '[data-component]',
                '[data-testid-prefix]',
                '[data-mf-root]',
                'form',
                'nav',
                'main',
                'header',
                'footer',
                '.card',
                '.modal-content',
                '.sidebar'
            ];

            let parent = node.parentElement;
            while (parent) {
                for (const selector of selectors) {
                    if (parent.matches(selector)) {
                        return {
                            selector,
                            tag: parent.tagName.toLowerCase(),
                            componentName: parent.getAttribute('data-component') || parent.className
                        };
                    }
                }
                parent = parent.parentElement;
            }
            return null;
        });
    }

    /**
     * Create a scoped locator if a boundary is found.
     * Uses Playwright's filter({ has: ... }) to ensure correctness.
     */
    async getScopedLocator(baseLocator, boundary) {
        if (!boundary || !baseLocator) return baseLocator;
        
        // Correct Scoping: Find the boundary that CONTAINS the base element
        return this.page.locator(boundary.selector).filter({ has: baseLocator }).first();
    }
}

module.exports = ComponentBoundaryDetector;
