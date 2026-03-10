const { logger } = require('../base/logger');
const fs = require('fs');
const path = require('path');

/**
 * AuthSeeder
 * High-speed API-based session seeding.
 * Executes the 2-step Login API (create_token -> verify_token)
 * and populates Playwright's storageState.
 */
class AuthSeeder {
    /**
     * @param {import('@playwright/test').APIRequestContext} request
     * @param {string} baseURL
     */
    constructor(request, baseURL) {
        this.request = request;
        this.baseURL = baseURL || 'https://stag.1mg.com';
        this.authFile = path.join(process.cwd(), '.auth', 'user.json');
    }

    /**
     * Seed a session using the 2-step API flow
     * @param {string} mobile
     * @param {string} otp
     */
    async seedSession(mobile, otp = '123456') {
        logger.info(`🚀 Seeding API Session for: ${mobile}`);

        // Step 1: Create Token (Request OTP)
        logger.info('Step 1: Calling create_token...');
        const createResponse = await this.request.post(`${this.baseURL}/auth_api/v6/create_token`, {
            headers: this._getCommonHeaders(),
            data: {
                number: mobile,
                email: "",
                is_corporate_user: false,
                signup_source: ""
            }
        });

        if (!createResponse.ok()) {
            const body = await createResponse.text();
            logger.error(`❌ create_token failed: ${createResponse.status()} - ${body}`);
            throw new Error('Failed to initiate login via API');
        }
        logger.info('✅ create_token success');

        // Step 2: Verify Token (Submit OTP)
        logger.info('Step 2: Calling verify_token...');
        const verifyResponse = await this.request.post(`${this.baseURL}/auth_api/v6/verify_token`, {
            headers: this._getCommonHeaders(),
            data: {
                number: mobile,
                verification_token: otp,
                signup_source: ""
            }
        });

        if (!verifyResponse.ok()) {
            const body = await verifyResponse.text();
            logger.error(`❌ verify_token failed: ${verifyResponse.status()} - ${body}`);
            throw new Error('Failed to verify OTP via API');
        }

        // Step 3: Capture Cookies & Storage State
        logger.info('✅ verify_token success. Capturing session...');

        // Playwright's APIRequestContext doesn't automatically export storageState 
        // like BrowserContext does, but it DOES follow redirects and manage cookies in the background.
        // To properly "Seed" a UI session, we need the cookies from this request.

        const cookies = await verifyResponse.headersArray()
            .filter(h => h.name.toLowerCase() === 'set-cookie')
            .map(h => h.value);

        if (cookies.length === 0) {
            logger.warn('⚠️  No cookies found in verify_token response. Session might not persist.');
        }

        // Since we are using this IN setup, we actually want to save the 
        // resulting state of the APIRequestContext if possible, but 
        // APIRequestContext.storageState() is only available in recent Playwright versions.
        // If not, we manually construct the storageState JSON.

        try {
            const state = await this.request.storageState();
            if (!fs.existsSync(path.dirname(this.authFile))) {
                fs.mkdirSync(path.dirname(this.authFile), { recursive: true });
            }
            fs.writeFileSync(this.authFile, JSON.stringify(state, null, 2));
            logger.info(`✨ Session Infused! Saved to: ${this.authFile}`);
        } catch (e) {
            logger.error('Failed to extract storage state from API context', e);
            throw e;
        }
    }

    _getCommonHeaders() {
        return {
            'accept': 'application/vnd.healthkartplus.v11+json',
            'content-type': 'application/json',
            'hkp-platform': 'Healthkartplus-0.0.1-mobileweb',
            'x-platform': 'mobileweb-0.0.1'
        };
    }
}

module.exports = { AuthSeeder };
