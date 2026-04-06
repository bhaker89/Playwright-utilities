const { logger } = require('../../utils/base/logger');
const memoryStore = require('./locator-memory-store');

/**
 * Locator Telemetry Engine
 * Collects execution data to enable autonomous learning.
 */
class LocatorTelemetryEngine {
    constructor() {
        this.cache = [];
        this.flushThreshold = process.env.CI === 'true' ? 5 : 1; 
        this.isFlushing = false;
    }

    /**
     * Collect telemetry for a locator execution.
     */
    async collect(data) {
        const telemetryData = {
            ...data,
            timestamp: new Date().toISOString()
        };
        
        this.cache.push(telemetryData);
        
        // Use proper framework logger
        logger.info(`[Telemetry] ${data.locatorKey} (${data.strategy ?? 'unknown'}): ${data.status} in ${data.duration}ms`);

        // Periodic flush to memory store
        if (this.cache.length >= this.flushThreshold && !this.isFlushing) {
            await this._flush();
        }
    }

    async _flush() {
        if (this.isFlushing) return;
        this.isFlushing = true;

        try {
            const batch = [...this.cache];
            this.cache = []; // Clear cache early to prevent double-processing

            for (const data of batch) {
                // Update memory store with the collected data
                // Never write malformed keys into the memory store.
                // If we don't have a strategy, we can't resolve it later.
                if (!data.strategy || typeof data.strategy !== 'string') {
                    continue;
                }

                await memoryStore.updateStats(
                    data.locatorKey,
                    data.strategy,
                    data.status === 'SUCCESS',
                    data.duration,
                    data.dom_signature
                );
            }
        } finally {
            this.isFlushing = false;
        }
    }
    /**
     * Clear all cached telemetry and metrics.
     */
    clear() {
        this.cache = [];
        logger.info(`[Telemetry] Metrics cleared.`);
    }

    /**
     * Get a summary of all metrics (for tests).
     */
    getSummary() {
        return {
            totalRescues: this.cache.filter(d => d.status === 'SUCCESS' && d.failureType).length,
            failures: this.cache.filter(d => d.status === 'FAILURE').length,
            successes: this.cache.filter(d => d.status === 'SUCCESS').length,
            cacheSize: this.cache.length
        };
    }
}

module.exports = new LocatorTelemetryEngine();
