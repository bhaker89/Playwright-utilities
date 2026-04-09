/**
 * Order Factory Telemetry
 * 
 * Tracks order creation metrics:
 * - Order type
 * - Creation strategy (API/UI/hybrid)
 * - Duration
 * - Success/failure
 * - Environment
 */

class OrderTelemetry {
  constructor() {
    this.metrics = [];
  }

  /**
   * Log order creation attempt
   * @param {Object} data - Telemetry data
   * @param {string} data.type - Order type (rx, otc, mixed, b2b, corporate)
   * @param {string} data.strategy - Execution strategy (api, ui, hybrid)
   * @param {number} data.duration - Creation duration in ms
   * @param {boolean} data.success - Whether creation succeeded
   * @param {string} data.orderId - Created order ID (if successful)
   * @param {string} data.environment - Environment name
   * @param {Object} data.blueprint - Order blueprint
   * @param {Error} data.error - Error object (if failed)
   */
  logOrderCreation(data) {
    const {
      type,
      strategy,
      duration,
      success,
      orderId,
      environment,
      blueprint,
      error
    } = data;

    const metric = {
      timestamp: new Date().toISOString(),
      type,
      strategy,
      duration,
      success,
      orderId,
      environment,
      blueprint
    };

    this.metrics.push(metric);

    // Console logging with clear formatting + order attributes
    const status = success ? '✓' : '✗';
    const color = success ? '\x1b[32m' : '\x1b[31m'; // Green or Red
    const reset = '\x1b[0m';

    // Extract key order attributes from blueprint
    const attributes = [];
    if (blueprint) {
      if (blueprint.split !== undefined) attributes.push(`split=${blueprint.split}`);
      if (blueprint.discount) attributes.push(`discount=${blueprint.discount}`);
      if (blueprint.prescription !== undefined) attributes.push(`prescription=${blueprint.prescription}`);
      if (blueprint.source) attributes.push(`source=${blueprint.source}`);
    }

    console.log(
      `${color}[ORDER_FACTORY]${reset} ${status} type=${type} strategy=${strategy}` +
      (attributes.length > 0 ? ` ${attributes.join(' ')}` : '') +
      ` duration=${duration}ms success=${success}` +
      (orderId ? ` orderId=${orderId}` : '') +
      (environment ? ` env=${environment}` : '')
    );

    if (!success && error) {
      console.error(`${color}[ORDER_FACTORY_ERROR]${reset}`, {
        type,
        strategy,
        blueprint,
        environment,
        error: error.message,
        stack: error.stack
      });
    }

    // Detailed logging for debugging
    if (process.env.DEBUG_ORDER_FACTORY === 'true') {
      console.log(`[ORDER_FACTORY_DEBUG]`, metric);
    }
  }

  /**
   * Get all metrics
   * @returns {Array} Array of metric objects
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Get metrics summary
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const total = this.metrics.length;
    const successful = this.metrics.filter(m => m.success).length;
    const failed = total - successful;

    const byStrategy = this.metrics.reduce((acc, m) => {
      acc[m.strategy] = (acc[m.strategy] || 0) + 1;
      return acc;
    }, {});

    const byType = this.metrics.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    }, {});

    const avgDuration = total > 0
      ? Math.round(this.metrics.reduce((sum, m) => sum + m.duration, 0) / total)
      : 0;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%',
      byStrategy,
      byType,
      avgDuration
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }
}

// Singleton instance
const telemetry = new OrderTelemetry();

module.exports = {
  OrderTelemetry,
  telemetry,
  logOrderCreation: (data) => telemetry.logOrderCreation(data),
  getMetrics: () => telemetry.getMetrics(),
  getSummary: () => telemetry.getSummary(),
  clearMetrics: () => telemetry.clear()
};