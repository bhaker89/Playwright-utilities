const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/login-page.page');
const { HomePage } = require('../../pages/home-page.page');
const { SearchResultPage } = require('../../pages/search-result-page.page');
const { CartPage } = require('../../pages/cart-page.page');
const { CheckoutPage } = require('../../pages/checkout-page.page');
const { OrderSuccessPage } = require('../../pages/order-success-page.page');

/**
 * 1MG Order Placement Test Suite
 * Validate order placement flow on 1MG website
 * 
 * Generated with UI Test Generator
 * Self-Healing: Enabled
 */
test.use({ storageState: { cookies: [], origins: [] } }); // Start with fresh context

test.describe('1MG Order Placement Test Suite', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000); // 2 minutes for manual OTP
    });

    test.describe('✅ Positive Tests', () => {
    test('Valid Login and Order Placement', async ({ page }) => {
        // Test: Validate login and order placement flow with valid credentials
        const loginPage = new LoginPage(page);
        const homePage = new HomePage(page);
        const searchResultPage = new SearchResultPage(page);
        const cartPage = new CartPage(page);
        const checkoutPage = new CheckoutPage(page);
        const orderSuccessPage = new OrderSuccessPage(page);

        const testData = {
        "otp": "",
        "mobileNumber": "9599612806"
};

        await loginPage.navigate();
        await loginPage.clickLoginLink();
        await loginPage.fillMobileNumberField('9599612806');
        await loginPage.clickLoginButton();
        
        console.log('⚠️  PLEASE ENTER OTP IN THE OPEN BROWSER AND CLICK VERIFY OTP');
        await page.pause(); // Pause for manual OTP entry
        
        await homePage.fillSearchTextBox('telma 40 tablet');
        await homePage.clickSearchButton();
        await searchResultPage.clickTelma40TabletProduct();
        await cartPage.fillQuantityField('2');
        await cartPage.clickProceedToCartButton();
        await cartPage.clickApplyCouponButton();
        
        // Handling coupons if applicable
        console.log('💡 You can manually apply a coupon now if the AI misses it');
        
        await checkoutPage.fillAddressField('tata 1mg sector 14, gurgaon');
        await checkoutPage.clickContinueButton();
        await checkoutPage.clickPlaceOrderButton();

        // Assertions
        await expect(orderSuccessPage.skuNameText).toContainText('Telma 40 Tablet');
        await expect(orderSuccessPage.quantityText).toContainText('2');
        await expect(orderSuccessPage.paymentDetailsText).toContainText('Cash on Delivery');
    });
    });

    test.describe('❌ Negative Tests', () => {
    test('Invalid OTP', async ({ page }) => {
        // Test: Validate login flow with invalid OTP
        const loginPage = new LoginPage(page);
        const homePage = new HomePage(page);
        const searchResultPage = new SearchResultPage(page);
        const cartPage = new CartPage(page);
        const checkoutPage = new CheckoutPage(page);
        const orderSuccessPage = new OrderSuccessPage(page);

        const testData = {
        "otp": "",
        "mobileNumber": "9599612806"
};

        await loginPage.navigate();
        await loginPage.clickLoginLink();
        await loginPage.fillMobileNumberField('9599612806');
        await loginPage.clickLoginButton();
        // TODO: Handle waitForOtp
        await loginPage.fillOTPField('invalid-otp');
        await loginPage.clickVerifyOTPButton();

        // Assertions
        await expect(page.locator('undefined')).toBeVisible();
        await expect(page.locator('undefined')).toHaveText('Invalid OTP');
    });
    });

});
