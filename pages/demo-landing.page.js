const { BasePage } = require('./base.page');

/**
 * A simple page object used exclusively to demonstrate SmartLocator self-healing.
 */
class DemoLandingPage extends BasePage {
    constructor(page) {
        super(page);
        this.pageUrl = process.env.UI_BASE_URL || 'https://stag.1mg.com';

        // ❌ INTENTIONALLY BROKEN LOCATOR ❌
        // We are looking for "Quick Order", but using a CSS class that doesn't exist.
        // A normal Playwright test would timeout and fail here.
        this.brokenQuickOrderCTA = this.page.locator('div.this-class-does-not-exist >> text=Quick Order');
    }

    async clickQuickOrder() {
        // We call BasePage.click(), which routes through SmartLocator.executeWithHealing()
        await this.click(this.brokenQuickOrderCTA, 'Quick Order');
    }
}

module.exports = { DemoLandingPage };
