const { logger } = require('../../utils/base/logger');

/**
 * LEGACY FILE (DEPRECATED)
 *
 * The old YAML SelfHealer implementation has been removed in favor of:
 * SmartLocator -> LIE (Locator Intelligence Engine).
 *
 * This file intentionally remains as a stub to avoid silent breakage in case
 * older code still tries to import it.
 */
class SelfHealer {
    constructor() {
        logger.error('[SelfHealer] Legacy engine invoked. This path is deprecated.');
        throw new Error(
            '[SelfHealer] This legacy engine has been removed. Use SmartLocator (LIE bridge) instead.'
        );
    }
}

module.exports = { SelfHealer };