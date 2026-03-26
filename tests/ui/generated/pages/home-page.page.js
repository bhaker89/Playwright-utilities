const { BasePage } = require('../../../../pages/base.page');

/**
 * HomePage
 * Generated Page Object with self-healing support
 * 
 * URL: /
 * Base URL: https://www.1mg.com
 */
class HomePage extends BasePage {
    constructor(page) {
        super(page);
        this.url = '/';
    }

    /**
     * Navigate to this page
     */
    async navigate() {
        await this.page.goto('https://www.1mg.com/');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Get Search Field locator
     * @returns {Locator}
     */
    get searchField() {
        // Search Field: textbox with specific ARIA name
        return this.page.getByRole('textbox', { name: "Search for Medicines and Health Products" });
    }

    /**
     * Get Search Button locator
     * @returns {Locator}
     */
    get searchButton() {
        // Search icon is an image inside the search bar
        return this.page.getByAltText('search icon').first();
    }

    /**
     * Fill Search Field
     * @param {string} value - Value to fill
     */
    async fillSearchField(value) {
        await this.clearOverlays();
        await this.healer.executeWithHealing(
            'Search Field',
            this.searchField,
            async (loc) => await loc.fill(value)
        );
    }

    /**
     * Click Search Button
     */
    async clickSearchButton() {
        await this.clearOverlays();
        await this.healer.executeWithHealing(
            'Search Button',
            this.searchButton,
            async (loc) => await loc.click()
        );
    }

    /**
     * Wait for page to be loaded
     */
    async waitForPageLoad() {
        await this.page.waitForURL('**/**');
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Verify page is loaded
     * @returns {Promise<boolean>}
     */
    async isPageLoaded() {
        return this.page.url().includes('/');
    }
}

module.exports = { HomePage };
