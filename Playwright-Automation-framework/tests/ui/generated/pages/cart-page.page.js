const { BasePage } = require('../../../../pages/base.page');

/**
 * CartPage
 * Generated Page Object with self-healing support
 * 
 * URL: /cart
 * Base URL: https://www.1mg.com
 */
class CartPage extends BasePage {
    constructor(page) {
        super(page);
        this.url = '/cart';
    }

    /**
     * Navigate to this page
     */
    async navigate() {
        await this.page.goto('https://www.1mg.com/cart');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Get Cart Items List locator
     * @returns {Locator}
     */
    get cartItemsList() {
        // Cart Items List: .cart-items-list
        return this.page.locator('.cart-items-list');
    }

    /**
     * Get Product Name in Cart locator
     * @returns {Locator}
     */
    get productNameInCart() {
        // Product Name in Cart: Verified class for item names
        return this.page.locator('.CartItem__itemName__2xG8H');
    }

    /**
     * Get Empty Cart Container locator
     * @returns {Locator}
     */
    get emptyCartContainer() {
        // Empty Cart: Verified class for empty container
        return this.page.locator('.EmptyCart__emptyCartContainer__2f1T0');
    }

    /**
     * Get Error Message locator
     * @returns {Locator}
     */
    get errorMessage() {
        // Error Message: Generic or specific
        return this.page.locator('.error-message, .NoResults__text__3B_7l');
    }




    /**
     * Wait for page to be loaded
     */
    async waitForPageLoad() {
        await this.page.waitForURL('**/cart**');
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Verify page is loaded
     * @returns {Promise<boolean>}
     */
    async isPageLoaded() {
        return this.page.url().includes('/cart');
    }
}

module.exports = { CartPage };
