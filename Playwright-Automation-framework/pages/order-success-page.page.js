const { BasePage } = require('./base.page');

/**
 * OrderSuccessPage
 * Generated Page Object with self-healing support
 * 
 * URL: /order-success
 * Base URL: https://www.1mg.com
 */
class OrderSuccessPage extends BasePage {
    constructor(page) {
        super(page);
        this.url = '/order-success';
    }

    /**
     * Navigate to this page
     */
    async navigate() {
        await this.page.goto('https://www.1mg.com/order-success');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Get Sku Name Text locator
     * @returns {Locator}
     */
    get skuNameText() {
        // Sku Name Text: .sku-name
        return this.page.locator('.sku-name');
    }

    /**
     * Get Quantity Text locator
     * @returns {Locator}
     */
    get quantityText() {
        // Quantity Text: .quantity
        return this.page.locator('.quantity');
    }

    /**
     * Get Payment Details Text locator
     * @returns {Locator}
     */
    get paymentDetailsText() {
        // Payment Details Text: .payment-details
        return this.page.locator('.payment-details');
    }




    /**
     * Wait for page to be loaded
     */
    async waitForPageLoad() {
        await this.page.waitForURL('**/order-success**');
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Verify page is loaded
     * @returns {Promise<boolean>}
     */
    async isPageLoaded() {
        return this.page.url().includes('/order-success');
    }
}

module.exports = { OrderSuccessPage };
