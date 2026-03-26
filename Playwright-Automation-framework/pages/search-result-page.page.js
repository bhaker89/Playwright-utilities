const { BasePage } = require('./base.page');

/**
 * SearchResultPage
 * Generated Page Object with self-healing support
 * 
 * URL: /search
 * Base URL: https://www.1mg.com
 */
class SearchResultPage extends BasePage {
    constructor(page) {
        super(page);
        this.url = '/search';
    }

    /**
     * Navigate to this page
     */
    async navigate() {
        await this.page.goto('https://www.1mg.com/search');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Get Telma 40 Tablet Product locator
     * @returns {Locator}
     */
    get telma40TabletProduct() {
        // Telma 40 Tablet Product: a[href*="telma-40-tablet"]
        return this.page.locator('a[href*="telma-40-tablet"]');
    }

    /**
     * Get Add to Cart Button locator
     * @returns {Locator}
     */
    get addToCartButton() {
        // Add to Cart Button: button[type='submit']
        return this.page.getByRole('button', { name: /Add to Cart/i });
    }

    /**
     * Click Telma 40 Tablet Product
     */
    async clickTelma40TabletProduct() {
        await this.healer.executeWithHealing(
            'Telma 40 Tablet Product',
            this.telma40TabletProduct,
            async (loc) => await loc.click()
        );
    }

    /**
     * Click Add to Cart Button
     */
    async clickAddToCartButton() {
        await this.healer.executeWithHealing(
            'Add to Cart Button',
            this.addToCartButton,
            async (loc) => await loc.click()
        );
    }

    /**
     * Wait for page to be loaded
     */
    async waitForPageLoad() {
        await this.page.waitForURL('**/search**');
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Verify page is loaded
     * @returns {Promise<boolean>}
     */
    async isPageLoaded() {
        return this.page.url().includes('/search');
    }
}

module.exports = { SearchResultPage };
