const { BasePage } = require('../../../../pages/base.page');

/**
 * SearchResultsPage
 * Generated Page Object with self-healing support
 * 
 * URL: /search
 * Base URL: https://www.1mg.com
 */
class SearchResultsPage extends BasePage {
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
     * Get Product List locator
     * @returns {Locator}
     */
    get productList() {
        // Product List: .style__product-list
        return this.page.locator('.style__product-list');
    }

    /**
     * Get First Product locator
     * @returns {Locator}
     */
    get firstProduct() {
        // Product cards always contain an image + have /drugs/ or /otc/ href
        // Using a:has(img) ensures we only match proper product cards, not inline description links
        return this.page.locator('a[href*="/otc/"]:has(img), a[href*="/drugs/"]:has(img)').first();
    }

    /**
     * Get Product Name locator
     * @returns {Locator}
     */
    get productName() {
        // Product Name: Target the name within the product link or specific class
        return this.page.locator('.Card__productName__3_9u0, .style__pro-title__3G3mI');
    }


    /**
     * Click First Product
     */
    async clickFirstProduct() {
        await this.clearOverlays();
        await this.healer.executeWithHealing(
            'First Product',
            this.firstProduct,
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

module.exports = { SearchResultsPage };
