const { logger } = require('../../utils/base/logger');

class PaymentHelper {
    /**
     * standard POST wrapper for payments
     */
    static async processPayment(apiContext, payload) {
        logger.info(`💳 Processing Payment for Order: ${payload.orderId}`);

        const response = await apiContext.post('/v1/payments/process', {
            data: payload
        });

        return response;
    }
}

module.exports = { PaymentHelper };
