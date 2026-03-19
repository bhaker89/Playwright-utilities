const { BasePage } = require('./base.page');

/**
 * LoginPage
 * Generated Page Object with self-healing support
 * 
 * URL: /
 * Base URL: https://www.1mg.com
 */
class LoginPage extends BasePage {
    constructor(page) {
        super(page);
        this.url = '/';
    }

    /**
     * Navigate to this page
     */
    async navigate() {
        await this.page.goto('https://www.1mg.com/');
        await this.page.waitForLoadState('load');
    }

    /**
     * Get Login Link locator
     * @returns {Locator}
     */
    get loginLink() {
        // Precise class found in header for both Login and Signup
        return this.page.locator('.Header__navigationItemText__ShdZ9').filter({ hasText: /^Login$/ }).first();
    }

    /**
     * Get Mobile Number Field locator
     * @returns {Locator}
     */
    get mobileNumberField() {
        // Definitive ID found in the login modal HTML
        return this.page.locator('input#phone');
    }

    /**
     * Get Login Button locator
     * @returns {Locator}
     */
    get loginButton() {
        // Definitive button found in the login modal HTML
        return this.page.locator('button[aria-label="Send OTP"]').or(this.page.getByRole('button', { name: /Send OTP/i }));
    }

    /**
     * Get OTP Field locator
     * @returns {Locator}
     */
    get oTPField() {
        return this.page.locator('input[type="number"], input[placeholder*="OTP"]').first();
    }

    /**
     * Get Verify OTP Button locator
     * @returns {Locator}
     */
    get verifyOTPButton() {
        return this.page.locator('button:has-text("VERIFY"), button:has-text("DONE")').first();
    }

    /**
     * Click Login Link
     */
    /**
     * Click Login Link
     */
    async clickLoginLink() {
        console.log('Clearing potential blockers before clicking Login...');
        await this.clearOverlays();

        console.log('Attempting to click Login link...');
        await this.healer.executeWithHealing(
            'Login Link',
            this.loginLink,
            async (loc) => {
                // Wait for it to be stable and visible without any timeout
                await loc.waitFor({ state: 'visible' });
                
                // Try clicking normally first. Playwright will auto-wait for it to be actionable.
                // If it fails due to being obscured, we'll try one more overlay clear.
                try {
                    await loc.click({ timeout: 5000 });
                } catch (e) {
                    console.log('Login link might be obscured. Clearing overlays again and retrying...');
                    await this.clearOverlays();
                    await loc.click();
                }
            }
        );

        // Verification: Ensure the mobile input is now present
        console.log('Verifying login modal opened...');
        await this.mobileNumberField.waitFor({ state: 'visible', timeout: 10000 });
        console.log('Login modal confirmed open.');
    }

    /**
     * Fill Mobile Number Field
     * @param {string} value - Value to fill
     */
    async fillMobileNumberField(value) {
        await this.healer.executeWithHealing(
            'Mobile Number Field',
            this.mobileNumberField,
            async (loc) => {
                await loc.waitFor({ state: 'visible', timeout: 10000 });
                // Ensure field is clear before typing
                await loc.click();
                await this.page.keyboard.press('Control+A');
                await this.page.keyboard.press('Backspace');
                await loc.fill(value);
            }
        );
    }

    /**
     * Click Login Button
     */
    async clickLoginButton() {
        await this.healer.executeWithHealing(
            'Login Button',
            this.loginButton,
            async (loc) => {
                await loc.waitFor({ state: 'visible', timeout: 5000 });
                await loc.click();
            }
        );
    }

    /**
     * Fill OTP Field
     * @param {string} value - Value to fill
     */
    async fillOTPField(value) {
        await this.healer.executeWithHealing(
            'OTP Field',
            this.oTPField,
            async (loc) => {
                await loc.waitFor({ state: 'visible', timeout: 5000 });
                await loc.fill(value);
            }
        );
    }

    /**
     * Click Verify OTP Button
     */
    async clickVerifyOTPButton() {
        await this.healer.executeWithHealing(
            'Verify OTP Button',
            this.verifyOTPButton,
            async (loc) => {
                await loc.waitFor({ state: 'visible', timeout: 5000 });
                await loc.click();
            }
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

module.exports = { LoginPage };
