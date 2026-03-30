const { BasePage } = require('./base.page');

/**
 * LoginPage
 * Generated Page Object with self-healing support
 * 
 * URL: /html/login.html
 * Base URL: https://stagadmin.1mg.com
 */
class LoginPage extends BasePage {
    constructor(page) {
        super(page);
        this.url = '/html/login.html';
    }

    /**
     * Navigate to this page
     */
    async navigate() {
        await this.page.goto('https://stagadmin.1mg.com/html/login.html');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Get Email Field locator
     * @returns {Locator}
     */
    get emailField() {
        // Email Field: input[type='email']
        return this.page.locator("input[type='email']");
    }

    /**
     * Get Password Field locator
     * @returns {Locator}
     */
    get passwordField() {
        // Password Field: input[type='password']
        return this.page.locator("input[type='password']");
    }

    /**
     * Get Google Sign-In Button locator
     * @returns {Locator}
     */
    get googleSignInButton() {
        // Google Sign-In Button: button[aria-label='Google Sign-In']
        // Page snapshot shows: button "Sign in with Google"
        return this.page.getByRole('button', { name: /sign in with google/i });
    }

    /**
     * Get Error Message locator
     * @returns {Locator}
     */
    get errorMessage() {
        // Error Message: .error-message
        return this.page.locator(".error-message");
    }

    /**
     * Fill Email Field
     * @param {string} value - Value to fill
     */
    async fillEmailField(value) {
        await this.healer.executeWithHealing(
            'Email Field',
            this.emailField,
            async (loc) => await loc.fill(value)
        );
    }

    /**
     * Fill Password Field
     * @param {string} value - Value to fill
     */
    async fillPasswordField(value) {
        await this.healer.executeWithHealing(
            'Password Field',
            this.passwordField,
            async (loc) => await loc.fill(value)
        );
    }

    /**
     * Click Google Sign-In Button
     */
    async clickGoogleSignInButton() {
        await this.healer.executeWithHealing(
            'Google Sign-In Button',
            this.googleSignInButton,
            async (loc) => await loc.click()
        );
    }


    /**
     * Wait for page to be loaded
     */
    async waitForPageLoad() {
        await this.page.waitForURL('**/html/login.html**');
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Verify page is loaded
     * @returns {Promise<boolean>}
     */
    async isPageLoaded() {
        return this.page.url().includes('/html/login.html');
    }
}

module.exports = { LoginPage };
