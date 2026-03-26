const { BasePage } = require('./base.page');

/**
 * GoogleAuthPage
 * Generated Page Object with self-healing support
 * 
 * URL: 
 * Base URL: https://stagadmin.1mg.com
 */
class GoogleAuthPage extends BasePage {
    constructor(page) {
        super(page);
        this.url = '';
    }

    /**
     * Navigate to this page
     */
    async navigate() {
        await this.page.goto('https://stagadmin.1mg.com');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Get Google Email Field locator
     * @returns {Locator}
     */
    get googleEmailField() {
        // Google Email Field: input[type='email']
        return this.page.locator("input[type='email']");
    }

    /**
     * Get Google Next Button locator
     * @returns {Locator}
     */
    get googleNextButton() {
        // Google Next Button: button[type='submit']
        return this.page.getByRole('button', { name: /Google Next/i });
    }

    /**
     * Get Google Password Field locator
     * @returns {Locator}
     */
    get googlePasswordField() {
        // Google Password Field: input[type='password']
        return this.page.locator("input[type='password']");
    }

    /**
     * Get Google Allow Button locator
     * @returns {Locator}
     */
    get googleAllowButton() {
        // Google Allow Button: button[type='submit']
        return this.page.getByRole('button', { name: /Google Allow/i });
    }

    /**
     * Fill Google Email Field
     * @param {string} value - Value to fill
     */
    async fillGoogleEmailField(value) {
        await this.healer.executeWithHealing(
            'Google Email Field',
            this.googleEmailField,
            async (loc) => await loc.fill(value)
        );
    }

    /**
     * Click Google Next Button
     */
    async clickGoogleNextButton() {
        await this.healer.executeWithHealing(
            'Google Next Button',
            this.googleNextButton,
            async (loc) => await loc.click()
        );
    }

    /**
     * Fill Google Password Field
     * @param {string} value - Value to fill
     */
    async fillGooglePasswordField(value) {
        await this.healer.executeWithHealing(
            'Google Password Field',
            this.googlePasswordField,
            async (loc) => await loc.fill(value)
        );
    }

    /**
     * Click Google Allow Button
     */
    async clickGoogleAllowButton() {
        await this.healer.executeWithHealing(
            'Google Allow Button',
            this.googleAllowButton,
            async (loc) => await loc.click()
        );
    }

    /**
     * Wait for page to be loaded
     */
    async waitForPageLoad() {
        await this.page.waitForURL('****');
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Verify page is loaded
     * @returns {Promise<boolean>}
     */
    async isPageLoaded() {
        return this.page.url().includes('');
    }
}

module.exports = { GoogleAuthPage };
