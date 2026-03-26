const { BasePage } = require('../../../../pages/base.page');

/**
 * ProductDetailsPage
 * Generated Page Object with self-healing support
 * 
 * URL: /product
 * Base URL: https://www.1mg.com
 */
class ProductDetailsPage extends BasePage {
    constructor(page) {
        super(page);
        this.url = '/product';
    }

    /**
     * Navigate to this page
     */
    async navigate() {
        await this.page.goto('https://www.1mg.com/product');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Get Add to Cart Button locator
     * @returns {Locator}
     */
    get addToCartButton() {
        // Add to Cart Button: button[data-test-id='add-to-cart-button']
        return this.page.getByRole('button', { name: /Add to Cart/i });
    }

    /**
     * Get Product Name locator
     * @returns {Locator}
     */
    get productName() {
        // Product Name: .product-name
        return this.page.locator('.product-name');
    }

    /**
     * Click Add to Cart Button
     */
    async clickAddToCartButton() {
        await this.clearOverlays();
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
        await this.page.waitForURL('**/product**');
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Verify page is loaded
     * @returns {Promise<boolean>}
     */
    async isPageLoaded() {
        return this.page.url().includes('/product');
    }
}

module.exports = { ProductDetailsPage };
