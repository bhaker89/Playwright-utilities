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
        logger.info(`[Telemetry] ${data.locatorKey} (${data.strategy}): ${data.status} in ${data.duration}ms`);

        // Periodic flush to memory store
        if (this.cache.length >= this.flushThreshold) {
            await this._flush();
        }
    }

    async _flush() {
        const batch = [...this.cache];
        this.cache = []; // Clear cache early to prevent double-processing

        for (const data of batch) {
            // Update memory store with the collected data
            await memoryStore.updateStats(
                data.locatorKey, 
                data.strategy, 
                data.status === 'SUCCESS', 
                data.duration,
                data.dom_signature
            );
        }
    }
}

module.exports = new LocatorTelemetryEngine();
