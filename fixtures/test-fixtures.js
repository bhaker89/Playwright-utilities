/**
 * Re-export unified base test
 * This file is kept for backwards compatibility
 * 
 * All test fixtures are now in base-test.js
 * 
 * Usage:
 * ```javascript
 * const { test, expect } = require('../fixtures/test-fixtures');
 * // OR
 * const { test, expect } = require('../fixtures/base-test');
 * ```
 */

module.exports = require('./base-test');