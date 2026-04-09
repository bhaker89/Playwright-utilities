/**
 * Payment Resolver
 * 
 * Resolves payment method based on:
 * - Order type
 * - Corporate flag
 * - Environment
 * - User type
 * 
 * Resolution Priority:
 * 1. Explicit payment override
 * 2. Order type-specific payment
 * 3. User type-specific payment
 * 4. Default payment method
 * 
 * Usage:
 *   const payment = await resolvePayment({
 *     type: 'corporate',
 *     orderType: 'b2b',
 *     userType: 'corporate'
 *   });
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Resolve payment method for order
 * 
 * @param {Object} params - Resolution parameters
 * @param {string} params.type - Payment type override
 * @param {string} params.orderType - Order type (rx, otc, mixed, b2b, corporate)
 * @param {string} params.userType - User type
 * @param {boolean} params.isCorporate - Corporate flag
 * @param {string} params.environment - Environment name
 * @param {Object} params.paymentOverride - Explicit payment object
 * @param {string} params.datasetPath - Custom dataset path
 * 
 * @returns {Promise<Object>} Resolved payment method
 */
async function resolvePayment(params) {
  const {
    type,
    orderType,
    userType,
    isCorporate = false,
    environment = 'test',
    paymentOverride,
    datasetPath
  } = params;

  console.log(`[PAYMENT_RESOLVER] Resolving payment for orderType="${orderType}", userType="${userType}", corporate=${isCorporate}`);

  // Priority 1: Explicit override
  if (paymentOverride) {
    console.log(`[PAYMENT_RESOLVER] Using payment override`);
    return validatePaymentMethod(paymentOverride);
  }

  // Load payment dataset
  const paymentDataset = await loadPaymentDataset('default', datasetPath);

  // Priority 2: Corporate payment
  if (isCorporate && paymentDataset.corporate) {
    console.log(`[PAYMENT_RESOLVER] Using corporate payment method`);
    return buildPaymentObject(paymentDataset.corporate);
  }

  // Priority 3: Order type-specific payment
  if (orderType && paymentDataset.orderTypes && paymentDataset.orderTypes[orderType]) {
    const method = paymentDataset.orderTypes[orderType];
    console.log(`[PAYMENT_RESOLVER] Using order type-specific payment: ${method}`);
    return buildPaymentObject(method);
  }

  // Priority 4: User type-specific payment
  if (userType && paymentDataset.userTypes && paymentDataset.userTypes[userType]) {
    const method = paymentDataset.userTypes[userType];
    console.log(`[PAYMENT_RESOLVER] Using user type-specific payment: ${method}`);
    return buildPaymentObject(method);
  }

  // Priority 5: Environment-specific payment
  if (paymentDataset.environments && paymentDataset.environments[environment]) {
    const method = paymentDataset.environments[environment];
    console.log(`[PAYMENT_RESOLVER] Using environment-specific payment: ${method}`);
    return buildPaymentObject(method);
  }

  // Priority 6: Type-specific payment
  if (type && paymentDataset[type]) {
    console.log(`[PAYMENT_RESOLVER] Using type-specific payment: ${type}`);
    return buildPaymentObject(paymentDataset[type]);
  }

  // Priority 7: Default payment
  if (paymentDataset.default) {
    console.log(`[PAYMENT_RESOLVER] Using default payment method`);
    return buildPaymentObject(paymentDataset.default);
  }

  // Fallback: COD
  const fallbackPayment = {
    method: 'cod',
    type: 'cash_on_delivery',
    name: 'Cash on Delivery'
  };
  console.warn(`[PAYMENT_RESOLVER] No payment found, using fallback: COD`);
  return fallbackPayment;
}

/**
 * Load payment dataset
 * 
 * @param {string} type - Payment dataset type
 * @param {string} customPath - Custom dataset path
 * @returns {Promise<Object>} Payment dataset
 */
async function loadPaymentDataset(type, customPath) {
  const datasetFileName = `${type}.json`;
  
  // Try custom path first (child repo override)
  if (customPath) {
    const customFilePath = path.join(customPath, 'payments', datasetFileName);
    try {
      const content = await fs.readFile(customFilePath, 'utf8');
      console.log(`[PAYMENT_RESOLVER] Loaded payment dataset from custom path: ${customFilePath}`);
      return JSON.parse(content);
    } catch (error) {
      console.log(`[PAYMENT_RESOLVER] Custom dataset not found: ${customFilePath}`);
    }
  }

  // Try core dataset
  const coreDatasetPath = path.join(__dirname, '../../datasets/payments', datasetFileName);
  try {
    const content = await fs.readFile(coreDatasetPath, 'utf8');
    console.log(`[PAYMENT_RESOLVER] Loaded payment dataset from core: ${coreDatasetPath}`);
    return JSON.parse(content);
  } catch (error) {
    console.warn(`[PAYMENT_RESOLVER] Core dataset not found: ${coreDatasetPath}`);
    return {};
  }
}

/**
 * Build payment object from method string or object
 * 
 * @param {string|Object} method - Payment method
 * @returns {Object} Payment object
 */
function buildPaymentObject(method) {
  // If already an object, validate and return
  if (typeof method === 'object') {
    return validatePaymentMethod(method);
  }

  // Build from string
  const paymentMethods = {
    'cod': {
      method: 'cod',
      type: 'cash_on_delivery',
      name: 'Cash on Delivery'
    },
    'card': {
      method: 'card',
      type: 'credit_card',
      name: 'Credit/Debit Card'
    },
    'upi': {
      method: 'upi',
      type: 'upi',
      name: 'UPI'
    },
    'netbanking': {
      method: 'netbanking',
      type: 'netbanking',
      name: 'Net Banking'
    },
    'wallet': {
      method: 'wallet',
      type: 'wallet',
      name: 'Wallet'
    },
    'corporate': {
      method: 'corporate',
      type: 'corporate_credit',
      name: 'Corporate Credit'
    },
    'corporate-credit': {
      method: 'corporate-credit',
      type: 'corporate_credit',
      name: 'Corporate Credit'
    },
    'invoice': {
      method: 'invoice',
      type: 'invoice',
      name: 'Pay by Invoice'
    }
  };

  return paymentMethods[method] || {
    method: method,
    type: method,
    name: method
  };
}

/**
 * Validate payment method object
 * 
 * @param {Object} payment - Payment object to validate
 * @returns {Object} Validated payment object
 */
function validatePaymentMethod(payment) {
  if (!payment || typeof payment !== 'object') {
    throw new Error('Invalid payment object');
  }

  // Ensure required fields
  return {
    method: payment.method || 'cod',
    type: payment.type || payment.method || 'cash_on_delivery',
    name: payment.name || payment.method || 'Cash on Delivery',
    ...payment // Preserve any additional fields
  };
}

module.exports = {
  resolvePayment,
  loadPaymentDataset,
  buildPaymentObject,
  validatePaymentMethod
};