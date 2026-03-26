const { BasePage } = require('./base.page');

/**
 * CheckoutPage
 * Generated Page Object with self-healing support
 * 
 * URL: /checkout
 * Base URL: https://www.1mg.com
 */
class CheckoutPage extends BasePage {
    constructor(page) {
        super(page);
        this.url = '/checkout';
    }

    /**
     * Navigate to this page
     */
    async navigate() {
        await this.page.goto('https://www.1mg.com/checkout');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Get Address Field locator
     * @returns {Locator}
     */
    get addressField() {
        return this.page.locator('input[type="text"]');
    }

    /**
     * Get Continue Button locator
     * @returns {Locator}
     */
    get continueButton() {
        // Continue Button: button[type='submit']
        return this.page.getByRole('button', { name: /Continue/i });
    }

    /**
     * Get Shipment Options locator
     * @returns {Locator}
     */
    get shipmentOptions() {
        return this.page.locator('select[name="shipment"]');
    }

    /**
     * Get Payment Mode Radio Button locator
     * @returns {Locator}
     */
    get paymentModeRadioButton() {
        return this.page.locator('input[type="radio"]');
    }

    /**
     * Get Place Order Button locator
     * @returns {Locator}
     */
    get placeOrderButton() {
        // Place Order Button: button[type='submit']
        return this.page.getByRole('button', { name: /Place Order/i });
    }

    /**
     * Fill Address Field
     * @param {string} value - Value to fill
     */
    async fillAddressField(value) {
        await this.healer.executeWithHealing(
            'Address Field',
            this.addressField,
            async (loc) => await loc.fill(value)
        );
    }

    /**
     * Click Continue Button
     */
    async clickContinueButton() {
        await this.healer.executeWithHealing(
            'Continue Button',
            this.continueButton,
            async (loc) => await loc.click()
        );
    }

    /**
     * Select option in Shipment Options
     * @param {string} value - Option value to select
     */
    async selectShipmentOptions(value) {
        await this.healer.executeWithHealing(
            'Shipment Options',
            this.shipmentOptions,
            async (loc) => await loc.selectOption(value)
        );
    }


    /**
     * Click Place Order Button
     */
    async clickPlaceOrderButton() {
        await this.healer.executeWithHealing(
            'Place Order Button',
            this.placeOrderButton,
            async (loc) => await loc.click()
        );
    }

    /**
     * Wait for page to be loaded
     */
    async waitForPageLoad() {
        await this.page.waitForURL('**/checkout**');
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Verify page is loaded
     * @returns {Promise<boolean>}
     */
    async isPageLoaded() {
        return this.page.url().includes('/checkout');
    }
}

module.exports = { CheckoutPage };
