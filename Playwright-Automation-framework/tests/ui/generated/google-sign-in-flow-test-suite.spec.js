// file: /Users/varun/IdeaProjects/Playwright-Automation/tests/ui/generated/google-sign-in-flow-test-suite.spec.js

const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../../pages/login-page.page');
const { AdminDashboardPage } = require('../../../pages/admin-dashboard-page.page');

/**
 * Google Sign-In Flow Test Suite
 * Tests the Google Sign-In flow for admin login on https://stagadmin.1mg.com/html/login.html
 *
 * Generated with UI Test Generator
 * Self-Healing: Disabled
 */
test.describe('Google Sign-In Flow Test Suite', () => {
    test.beforeEach(async ({ page }) => {
        // Setup code (intentionally left blank)
        // We navigate explicitly via LoginPage.navigate() to avoid competing navigations/redirects.
    });

    test('Valid Google Sign-In', async ({ page }) => {
        // Test: Admin can login with valid Google credentials
        const loginPage = new LoginPage(page);
        const adminDashboardPage = new AdminDashboardPage(page);

        const testData = {
            googleEmail: process.env.GOOGLE_TEST_EMAIL,
            googlePassword: process.env.GOOGLE_TEST_PASSWORD
        };

        if (!testData.googleEmail || !testData.googlePassword) {
            throw new Error('Missing GOOGLE_TEST_EMAIL / GOOGLE_TEST_PASSWORD in config/.env.<env>');
        }

        await loginPage.navigate();

        // Click "Sign in with Google" and robustly detect where Google rendered:
        // - new window/tab (context.pages())
        // - or accounts.google.com inside a frame
        const context = page.context();
        const pagesBeforeClick = new Set(context.pages());

        await loginPage.clickGoogleSignInButton();

        // Wait until either a new page appears OR an accounts.google.com frame appears
        await expect
            .poll(
                () => {
                    const newPage = context.pages().find((p) => !pagesBeforeClick.has(p));
                    if (newPage) return true;

                    const hasGoogleFrame = context
                        .pages()
                        .some((p) => p.frames().some((f) => /accounts\.google\.com/i.test(f.url())));

                    return hasGoogleFrame;
                },
                { timeout: 30000 }
            )
            .toBeTruthy();

        // Pick auth page: prefer the newly opened page, else use the current page
        const newlyOpenedAuthPage = context.pages().find((p) => !pagesBeforeClick.has(p));
        const authPage = newlyOpenedAuthPage || page;

        await authPage.waitForLoadState('domcontentloaded');

        // Pick the accounts.google.com frame if present; otherwise interact with main frame
        const authFrame =
            authPage.frames().find((f) => /accounts\.google\.com/i.test(f.url())) || authPage.mainFrame();

        // Debug (optional but useful while stabilizing)
        console.log('Main app URL:', page.url());
        console.log('Auth page URL:', authPage.url());
        console.log('Auth frame URL:', authFrame.url());

        // Fill email (use the most reliable identifier field)
        const emailField = authFrame.locator('input[type="email"][name="identifier"]');
        await emailField.waitFor({ state: 'visible', timeout: 30000 });
        await emailField.fill(testData.googleEmail);

        // Click Next (Google typically uses "Next")
        const nextButton = authFrame.getByRole('button', { name: /^Next$/i });
        await nextButton.waitFor({ state: 'visible', timeout: 30000 });
        await nextButton.click();

        // Fill password
        const passwordField = authFrame.locator('input[type="password"][name="Passwd"]');
        await passwordField.waitFor({ state: 'visible', timeout: 30000 });
        await passwordField.fill(testData.googlePassword);

        // Click Next again
        await nextButton.waitFor({ state: 'visible', timeout: 30000 });
        await nextButton.click();

        // After successful auth, your original app page should reach the dashboard
        await page.waitForURL('**/admin/dashboard**', { timeout: 60000 });

        // Assertions
        expect(page.url()).toContain('/admin/dashboard');
        await expect(adminDashboardPage.adminDashboardHeader).toBeVisible();
    });
});