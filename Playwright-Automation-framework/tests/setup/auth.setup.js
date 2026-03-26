const { test: setup } = require('@playwright/test');
const { AuthHelper } = require('../../utils/api/auth-helper');
const { AuthSeeder } = require('../../utils/api/auth-seeder');
const { env } = require('../../config/environment.config');
const { logger } = require('../../utils/base/logger');
const path = require('path');
const fs = require('fs');

const authFile = path.join(__dirname, '../../.auth/user.json');

/**
 * Check if existing auth state is fresh
 * @param {string} filePath 
 * @param {number} ttlMinutes - Time-to-live in minutes
 * @returns {boolean}
 */
function isFreshAuthState(filePath, ttlMinutes = 12 * 60) {
    if (!fs.existsSync(filePath)) {
        logger.info('[Auth Setup] No existing auth file found');
        return false;
    }
    
    const stat = fs.statSync(filePath);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageMinutes = Math.floor(ageMs / (60 * 1000));
    
    if (stat.size < 50) {
        logger.warn('[Auth Setup] Auth file exists but is too small, regenerating');
        return false;
    }
    
    if (ageMs >= ttlMinutes * 60 * 1000) {
        logger.info(`[Auth Setup] Auth file is stale (${ageMinutes} minutes old), regenerating`);
        return false;
    }
    
    logger.info(`[Auth Setup] ✅ Reusing existing auth file (${ageMinutes} minutes old)`);
    return true;
}

setup('authenticate', async ({ page, request }) => {
    const mobile = process.env.TEST_MOBILE || '9599612806';
    const otp = process.env.TEST_OTP || '123456';
    
    // Configuration
    const force = process.env.FORCE_AUTH === 'true';
    const ttlMinutes = Number(process.env.AUTH_TTL_MINUTES || 720); // 12 hours default
    
    // Skip if auth is fresh and not forced
    if (!force && isFreshAuthState(authFile, ttlMinutes)) {
        logger.info('[Auth Setup] ♻️  Reusing shared session for all tests');
        return;
    }
    
    logger.info('[Auth Setup] 🔐 Generating new shared session...');
    
    if (process.env.USE_API_AUTH === 'true') {
        logger.info('[Auth Setup] Using API-based auth (fast)');
        const seeder = new AuthSeeder(request, env.uiBaseURL);
        await seeder.seedSession(mobile, otp);
    } else {
        logger.info('[Auth Setup] Using UI-based auth');
        const authHelper = new AuthHelper(page);
        await authHelper.loginWithOTP(mobile, otp);
        await page.context().storageState({ path: authFile });
    }
    
    logger.info('[Auth Setup] ✅ Shared session ready for all UI + API tests');
});
