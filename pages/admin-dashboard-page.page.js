const { BasePage } = require('./base.page');

/**
 * AdminDashboardPage
 * Generated Page Object with self-healing support
 * 
 * URL: /admin/dashboard
 * Base URL: https://stagadmin.1mg.com
 */
class AdminDashboardPage extends BasePage {
    constructor(page) {
        super(page);
        this.url = '/admin/dashboard';
    }

    /**
     * Navigate to this page
     */
    async navigate() {
        await this.page.goto('https://stagadmin.1mg.com/admin/dashboard');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Get Admin Dashboard Header locator
     * @returns {Locator}
     */
    get adminDashboardHeader() {
        // Admin Dashboard Header: h1.dashboard-header
        return this.page.locator("h1.dashboard-header");
    }


    /**
     * Wait for page to be loaded
     */
    async waitForPageLoad() {
        await this.page.waitForURL('**/admin/dashboard**');
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Verify page is loaded
     * @returns {Promise<boolean>}
     */
    async isPageLoaded() {
        return this.page.url().includes('/admin/dashboard');
    }
}

module.exports = { AdminDashboardPage };
