const { test, expect, logger } = require('../../fixtures/base-test');
const { DemoLandingPage } = require('../../pages/demo-landing.page');

test.describe('SmartLocator Self-Healing Demo @healing', () => {

    test('Test survives a broken locator via AI/Semantic Healing', async ({ page }) => {
        logger.info('🚀 Initiating SmartLocator Demo...');

        const demoPage = new DemoLandingPage(page);

        // 1. Navigate to the landing page
        await demoPage.navigate(true);

        // 2. Perform the action with the INTENTIONALLY BROKEN locator
        logger.info('🔍 Attempting to click the broken "Quick Order" locator...');

        // When this fails inside BasePage.click(), the SmartLocator will take over.
        // It will try Stage 1 (Registry), Stage 2 (Fuzzy), and Stage 3 (LLM) to save the test.
        await demoPage.clickQuickOrder();

        logger.info('✅ Test successfully completed. The broken locator was healed dynamically!');
    });

});
