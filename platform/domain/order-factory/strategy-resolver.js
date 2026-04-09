/**
 * Order Strategy Resolver
 * 
 * Determines execution strategy based on order type and attributes:
 * - API: Backend API-based order creation (fastest, preferred)
 * - UI: Browser-based order creation (fallback)
 * - Hybrid: API creation + UI validation
 */

/**
 * Resolve execution strategy for order blueprint
 * 
 * Strategy Selection Logic:
 * 
 * 1. B2B Orders → API (backend only)
 * 2. Corporate Orders → API (backend only)
 * 3. RX without prescription → API preferred, fallback UI
 * 4. Mixed Orders → Hybrid (API + UI validation)
 * 5. Complex modifiers (split, discount) → Hybrid
 * 6. Default → UI (safest for unknown scenarios)
 * 
 * @param {Object} orderBlueprint - Order configuration
 * @param {string} orderBlueprint.type - Order type (rx, otc, mixed, b2b, corporate)
 * @param {boolean} orderBlueprint.prescription - Whether prescription is required
 * @param {boolean} orderBlueprint.split - Whether order should be split
 * @param {string} orderBlueprint.source - Order source (web, app, paytm, etc.)
 * @param {string} orderBlueprint.discount - Discount type (coupon, loyalty, etc.)
 * @param {Object} options - Resolution options
 * @param {boolean} options.forceApi - Force API strategy
 * @param {boolean} options.forceUi - Force UI strategy
 * @param {string} options.environment - Current environment
 * @returns {string} Strategy type: "api", "ui", or "hybrid"
 */
function resolveStrategy(orderBlueprint, options = {}) {
  const {
    type,
    prescription = true,
    split = false,
    discount = null,
    source = 'web',
    attributes = {}
  } = orderBlueprint;

  const {
    forceApi = false,
    forceUi = false,
    environment = 'qa'
  } = options;

  // Force overrides (for testing)
  if (forceApi) {
    console.log('[STRATEGY_RESOLVER] Forced API strategy');
    return 'api';
  }
  if (forceUi) {
    console.log('[STRATEGY_RESOLVER] Forced UI strategy');
    return 'ui';
  }

  // B2B orders → API only (no UI flow available)
  if (type === 'b2b') {
    console.log('[STRATEGY_RESOLVER] B2B order → API strategy');
    return 'api';
  }

  // Corporate orders → API only
  if (type === 'corporate') {
    console.log('[STRATEGY_RESOLVER] Corporate order → API strategy');
    return 'api';
  }

  // RX without prescription → API preferred
  if (type === 'rx' && prescription === false) {
    console.log('[STRATEGY_RESOLVER] RX without prescription → API strategy');
    return 'api';
  }

  // Mixed orders → Hybrid (need UI validation)
  if (type === 'mixed') {
    console.log('[STRATEGY_RESOLVER] Mixed order → Hybrid strategy (API + UI validation)');
    return 'hybrid';
  }

  // Orders with split → Hybrid (complex validation needed)
  if (split === true) {
    console.log('[STRATEGY_RESOLVER] Split order → Hybrid strategy');
    return 'hybrid';
  }

  // Orders with discount/coupon → Hybrid (need UI validation)
  if (discount) {
    console.log('[STRATEGY_RESOLVER] Order with discount → Hybrid strategy');
    return 'hybrid';
  }

  // Orders from external sources (Paytm, PhonePe) → API preferred
  if (['paytm', 'phonepe', 'gpay', 'partner'].includes(source)) {
    console.log(`[STRATEGY_RESOLVER] External source (${source}) → API strategy`);
    return 'api';
  }

  // Production environment → Prefer API for speed
  if (environment === 'production' || environment === 'prod') {
    console.log('[STRATEGY_RESOLVER] Production environment → API strategy');
    return 'api';
  }

  // Default: UI strategy (safest, most reliable)
  console.log('[STRATEGY_RESOLVER] Default → UI strategy');
  return 'ui';
}

/**
 * Get strategy description
 * @param {string} strategy - Strategy type
 * @returns {string} Human-readable description
 */
function getStrategyDescription(strategy) {
  const descriptions = {
    api: 'Backend API-based order creation (fastest)',
    ui: 'Browser-based order creation (most reliable)',
    hybrid: 'API creation + UI validation (balanced)'
  };
  return descriptions[strategy] || 'Unknown strategy';
}

/**
 * Validate if strategy can be executed
 * @param {string} strategy - Strategy type
 * @param {Object} context - Execution context
 * @returns {Object} Validation result { valid, reason }
 */
function validateStrategy(strategy, context = {}) {
  const { apiAvailable = true, browserAvailable = true } = context;

  if (strategy === 'api' && !apiAvailable) {
    return {
      valid: false,
      reason: 'API not available, cannot execute API strategy'
    };
  }

  if ((strategy === 'ui' || strategy === 'hybrid') && !browserAvailable) {
    return {
      valid: false,
      reason: 'Browser not available, cannot execute UI strategy'
    };
  }

  return { valid: true };
}

module.exports = {
  resolveStrategy,
  getStrategyDescription,
  validateStrategy
};