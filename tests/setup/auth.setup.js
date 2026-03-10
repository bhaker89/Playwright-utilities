const { test: setup, expect } = require('@playwright/test');
const { AuthHelper } = require('../../utils/api/auth-helper');
const { AuthSeeder } = require('../../utils/api/auth-seeder');
const { env } = require('../../config/environment.config');
const path = require('path');

const authFile = path.join(__dirname, '../../.auth/user.json');

setup('authenticate', async ({ page, request }) => {
    const mobile = process.env.TEST_MOBILE || '9599612806';
    const otp = process.env.TEST_OTP || '123456';

    if (process.env.USE_API_AUTH === 'true') {
        const seeder = new AuthSeeder(request, env.uiBaseURL);
        await seeder.seedSession(mobile, otp);
    } else {
        const authHelper = new AuthHelper(page);
        await authHelper.loginWithOTP(mobile, otp);
        await page.context().storageState({ path: authFile });
    }
});
