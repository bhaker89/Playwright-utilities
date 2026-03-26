const { logger } = require('../../utils/base/logger');

/**
 * ============================================================================
 * SHARED TEST CONTEXT
 * ============================================================================
 * 
 * A singleton class that manages shared state between API and UI tests
 * within the same test session. Provides type-safe storage and retrieval
 * of test data that needs to be shared across different test types.
 * 
 * USE CASES:
 * ----------
 * 1. Store auth tokens from API login for UI tests
 * 2. Store created resource IDs from API for UI verification
 * 3. Store API responses for assertions in UI tests
 * 4. Share user data between test steps
 * 5. Store session data across integrated test flows
 * 
 * FEATURES:
 * ---------
 * ✅ Singleton pattern - One instance per test session
 * ✅ Type-safe with JSDoc annotations
 * ✅ Automatic logging of set/get operations
 * ✅ Scoped contexts (global, suite, test)
 * ✅ Clear and reset capabilities
 * ✅ Has/exists checks
 * ✅ Nested key support (dot notation)
 * ✅ Array storage and manipulation
 * ✅ JSON serialization support
 * 
 * USAGE EXAMPLES:
 * ---------------
 * ```javascript
 * // In API test - Store auth token
 * const response = await apiClient.post('/auth/login', credentials);
 * SharedTestContext.getInstance().set('auth.token', response.body.token);
 * SharedTestContext.getInstance().set('auth.userId', response.body.userId);
 * 
 * // In UI test - Retrieve and use token
 * const token = SharedTestContext.getInstance().get('auth.token');
 * await page.evaluate((token) => {
 *   localStorage.setItem('authToken', token);
 * }, token);
 * 
 * // Store API response for later verification
 * const createResponse = await apiClient.post('/users', userData);
 * SharedTestContext.getInstance().set('createdUser', createResponse.body);
 * 
 * // Retrieve in UI test
 * const user = SharedTestContext.getInstance().get('createdUser');
 * await page.goto(`/users/${user.id}`);
 * 
 * // Array operations
 * SharedTestContext.getInstance().push('orderIds', orderId);
 * const allOrders = SharedTestContext.getInstance().get('orderIds');
 * ```
 * 
 * ============================================================================
 */

/**
 * @typedef {'global' | 'suite' | 'test'} ScopeType
 */

/**
 * @typedef {Object} ContextScope
 * @property {Map<string, any>} global
 * @property {Map<string, any>} suite
 * @property {Map<string, any>} test
 */

/**
 * Shared Test Context - Singleton class for managing shared state
 */
class SharedTestContext {
  /**
   * @private
   * @type {SharedTestContext | null}
   */
  static instance = null;

  /**
   * Private constructor to enforce singleton pattern
   * @private
   */
  constructor() {
    /** @type {ContextScope} */
    this.context = {
      global: new Map(),
      suite: new Map(),
      test: new Map(),
    };
    
    /** @type {string | null} */
    this.currentSuiteName = null;
    
    /** @type {string | null} */
    this.currentTestName = null;
    
    logger.info('SharedTestContext initialized');
  }

  /**
   * Get the singleton instance
   * @returns {SharedTestContext}
   */
  static getInstance() {
    if (!SharedTestContext.instance) {
      SharedTestContext.instance = new SharedTestContext();
    }
    return SharedTestContext.instance;
  }

  /**
   * Set the current suite name for scoped context
   * @param {string} suiteName
   */
  setSuiteName(suiteName) {
    this.currentSuiteName = suiteName;
    logger.debug(`Context suite set to: ${suiteName}`);
  }

  /**
   * Set the current test name for scoped context
   * @param {string} testName
   */
  setTestName(testName) {
    this.currentTestName = testName;
    logger.debug(`Context test set to: ${testName}`);
  }

  /**
   * Get the appropriate scope map
   * @private
   * @param {ScopeType} scope
   * @returns {Map<string, any>}
   */
  getScope(scope = 'global') {
    return this.context[scope];
  }

  /**
   * Store a value in the context
   * 
   * @template T
   * @param {string} key - The key to store the value under (supports dot notation)
   * @param {T} value - The value to store
   * @param {ScopeType} [scope='global'] - The scope to store in (global, suite, test)
   * 
   * @example
   * context.set('auth.token', 'abc123');
   * context.set('user.id', 456, 'suite');
   */
  set(key, value, scope = 'global') {
    const scopeMap = this.getScope(scope);
    
    // Handle nested keys (dot notation)
    if (key.includes('.')) {
      const keys = key.split('.');
      const lastKey = keys.pop();
      const nestedKey = keys.join('.');
      
      let nestedObj = scopeMap.get(nestedKey);
      if (!nestedObj || typeof nestedObj !== 'object') {
        nestedObj = {};
        scopeMap.set(nestedKey, nestedObj);
      }
      
      nestedObj[lastKey] = value;
      logger.debug(`Context [${scope}] SET: ${key} = ${this.formatValue(value)}`);
    } else {
      scopeMap.set(key, value);
      logger.debug(`Context [${scope}] SET: ${key} = ${this.formatValue(value)}`);
    }
  }

  /**
   * Retrieve a value from the context
   * 
   * @template T
   * @param {string} key - The key to retrieve (supports dot notation)
   * @param {ScopeType} [scope='global'] - The scope to retrieve from (global, suite, test)
   * @param {T} [defaultValue] - Default value if key doesn't exist
   * @returns {T | undefined} The stored value or defaultValue
   * 
   * @example
   * const token = context.get('auth.token');
   * const userId = context.get('user.id', 'suite', 0);
   */
  get(key, scope = 'global', defaultValue = undefined) {
    const scopeMap = this.getScope(scope);
    
    // Handle nested keys (dot notation)
    if (key.includes('.')) {
      const keys = key.split('.');
      const firstKey = keys.shift();
      const nestedObj = scopeMap.get(firstKey);
      
      if (!nestedObj || typeof nestedObj !== 'object') {
        logger.debug(`Context [${scope}] GET: ${key} = NOT FOUND (using default: ${defaultValue})`);
        return defaultValue;
      }
      
      let value = nestedObj;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          logger.debug(`Context [${scope}] GET: ${key} = NOT FOUND (using default: ${defaultValue})`);
          return defaultValue;
        }
      }
      
      logger.debug(`Context [${scope}] GET: ${key} = ${this.formatValue(value)}`);
      return value;
    } else {
      const value = scopeMap.get(key);
      const returnValue = value !== undefined ? value : defaultValue;
      logger.debug(`Context [${scope}] GET: ${key} = ${this.formatValue(returnValue)}`);
      return returnValue;
    }
  }

  /**
   * Check if a key exists in the context
   * 
   * @param {string} key - The key to check
   * @param {ScopeType} [scope='global'] - The scope to check in
   * @returns {boolean} true if key exists, false otherwise
   */
  has(key, scope = 'global') {
    const scopeMap = this.getScope(scope);
    
    if (key.includes('.')) {
      const keys = key.split('.');
      const firstKey = keys.shift();
      const nestedObj = scopeMap.get(firstKey);
      
      if (!nestedObj || typeof nestedObj !== 'object') {
        return false;
      }
      
      let value = nestedObj;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return false;
        }
      }
      return true;
    } else {
      return scopeMap.has(key);
    }
  }

  /**
   * Delete a key from the context
   * 
   * @param {string} key - The key to delete
   * @param {ScopeType} [scope='global'] - The scope to delete from
   * @returns {boolean} true if deleted, false if key didn't exist
   */
  delete(key, scope = 'global') {
    const scopeMap = this.getScope(scope);
    const deleted = scopeMap.delete(key);
    
    if (deleted) {
      logger.debug(`Context [${scope}] DELETE: ${key}`);
    } else {
      logger.debug(`Context [${scope}] DELETE FAILED: ${key} (not found)`);
    }
    
    return deleted;
  }

  /**
   * Push a value to an array in the context
   * Creates the array if it doesn't exist
   * 
   * @template T
   * @param {string} key - The key of the array
   * @param {T} value - The value to push
   * @param {ScopeType} [scope='global'] - The scope to use
   * 
   * @example
   * context.push('orderIds', '123');
   * context.push('orderIds', '456');
   * // orderIds = ['123', '456']
   */
  push(key, value, scope = 'global') {
    const existing = this.get(key, scope);
    
    if (Array.isArray(existing)) {
      existing.push(value);
      this.set(key, existing, scope);
    } else {
      this.set(key, [value], scope);
    }
    
    logger.debug(`Context [${scope}] PUSH: ${key} <- ${this.formatValue(value)}`);
  }

  /**
   * Pop a value from an array in the context
   * 
   * @template T
   * @param {string} key - The key of the array
   * @param {ScopeType} [scope='global'] - The scope to use
   * @returns {T | undefined} The popped value or undefined
   */
  pop(key, scope = 'global') {
    const existing = this.get(key, scope);
    
    if (Array.isArray(existing) && existing.length > 0) {
      const value = existing.pop();
      this.set(key, existing, scope);
      logger.debug(`Context [${scope}] POP: ${key} -> ${this.formatValue(value)}`);
      return value;
    }
    
    logger.debug(`Context [${scope}] POP FAILED: ${key} (not an array or empty)`);
    return undefined;
  }

  /**
   * Merge an object into an existing object in the context
   * 
   * @template T
   * @param {string} key - The key of the object
   * @param {T} value - The object to merge
   * @param {ScopeType} [scope='global'] - The scope to use
   */
  merge(key, value, scope = 'global') {
    const existing = this.get(key, scope);
    
    if (existing && typeof existing === 'object') {
      const merged = { ...existing, ...value };
      this.set(key, merged, scope);
      logger.debug(`Context [${scope}] MERGE: ${key}`);
    } else {
      this.set(key, value, scope);
      logger.debug(`Context [${scope}] MERGE (new): ${key}`);
    }
  }

  /**
   * Get all keys in a scope
   * 
   * @param {ScopeType} [scope='global'] - The scope to get keys from
   * @returns {string[]} Array of all keys
   */
  getKeys(scope = 'global') {
    const scopeMap = this.getScope(scope);
    return Array.from(scopeMap.keys());
  }

  /**
   * Get all values in a scope
   * 
   * @param {ScopeType} [scope='global'] - The scope to get values from
   * @returns {any[]} Array of all values
   */
  getValues(scope = 'global') {
    const scopeMap = this.getScope(scope);
    return Array.from(scopeMap.values());
  }

  /**
   * Get all entries in a scope
   * 
   * @param {ScopeType} [scope='global'] - The scope to get entries from
   * @returns {Array<[string, any]>} Array of [key, value] pairs
   */
  getEntries(scope = 'global') {
    const scopeMap = this.getScope(scope);
    return Array.from(scopeMap.entries());
  }

  /**
   * Get the size (number of keys) in a scope
   * 
   * @param {ScopeType} [scope='global'] - The scope to check
   * @returns {number} Number of keys
   */
  size(scope = 'global') {
    const scopeMap = this.getScope(scope);
    return scopeMap.size;
  }

  /**
   * Clear a specific scope
   * 
   * @param {ScopeType} scope - The scope to clear
   */
  clearScope(scope) {
    const scopeMap = this.getScope(scope);
    const size = scopeMap.size;
    scopeMap.clear();
    logger.info(`Context [${scope}] CLEARED (${size} items removed)`);
  }

  /**
   * Clear all scopes
   */
  clearAll() {
    const totalSize = this.context.global.size + this.context.suite.size + this.context.test.size;
    this.context.global.clear();
    this.context.suite.clear();
    this.context.test.clear();
    logger.info(`Context ALL CLEARED (${totalSize} total items removed)`);
  }

  /**
   * Export context to JSON
   * 
   * @param {ScopeType | 'all'} [scope='global'] - The scope to export (or 'all' for everything)
   * @returns {Object} JSON representation of the context
   */
  toJSON(scope = 'global') {
    if (scope === 'all') {
      return {
        global: Object.fromEntries(this.context.global),
        suite: Object.fromEntries(this.context.suite),
        test: Object.fromEntries(this.context.test),
      };
    } else {
      return Object.fromEntries(this.getScope(scope));
    }
  }

  /**
   * Import context from JSON
   * 
   * @param {Object} data - The JSON data to import
   * @param {ScopeType} [scope='global'] - The scope to import into
   * @param {boolean} [merge=true] - Whether to merge with existing data
   */
  fromJSON(data, scope = 'global', merge = true) {
    const scopeMap = this.getScope(scope);
    
    if (!merge) {
      scopeMap.clear();
    }
    
    Object.entries(data).forEach(([key, value]) => {
      scopeMap.set(key, value);
    });
    
    logger.info(`Context [${scope}] IMPORTED ${Object.keys(data).length} items (merge: ${merge})`);
  }

  /**
   * Print the current context state (for debugging)
   * 
   * @param {ScopeType | 'all'} [scope='all'] - The scope to print (or 'all' for everything)
   */
  print(scope = 'all') {
    console.log('\n========================================');
    console.log('SHARED TEST CONTEXT STATE');
    console.log('========================================');
    
    if (scope === 'all') {
      this.printScope('global');
      this.printScope('suite');
      this.printScope('test');
    } else {
      this.printScope(scope);
    }
    
    console.log('========================================\n');
  }

  /**
   * Print a specific scope
   * @private
   * @param {ScopeType} scope
   */
  printScope(scope) {
    const scopeMap = this.getScope(scope);
    console.log(`\n[${scope.toUpperCase()} SCOPE] - ${scopeMap.size} items`);
    
    if (scopeMap.size === 0) {
      console.log('  (empty)');
    } else {
      scopeMap.forEach((value, key) => {
        console.log(`  ${key}: ${this.formatValue(value)}`);
      });
    }
  }

  /**
   * Format a value for logging (truncate if too long)
   * @private
   * @param {any} value
   * @returns {string}
   */
  formatValue(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    
    try {
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return str.length > 100 ? str.substring(0, 100) + '...' : str;
    } catch {
      return '[Complex Object]';
    }
  }

  /**
   * Reset the singleton instance (useful for testing)
   * ⚠️ Use with caution - only for test cleanup
   */
  static reset() {
    if (SharedTestContext.instance) {
      SharedTestContext.instance.clearAll();
      SharedTestContext.instance = null;
      logger.info('SharedTestContext instance reset');
    }
  }
}

/**
 * Convenience export - Get the singleton instance
 */
const sharedContext = SharedTestContext.getInstance();

/**
 * @typedef {Object} AuthContext
 * @property {string} [token]
 * @property {string} [refreshToken]
 * @property {string | number} [userId]
 * @property {string} [username]
 * @property {number} [expiresAt]
 */

/**
 * @typedef {Object} ApiResponseContext
 * @property {number} status
 * @property {any} body
 * @property {Record<string, string>} [headers]
 * @property {number} [responseTime]
 */

/**
 * @typedef {Object} UserContext
 * @property {string | number} id
 * @property {string} [name]
 * @property {string} [email]
 * @property {string} [role]
 */

/**
 * Helper functions for common operations
 */
class ContextHelpers {
  /**
   * Store authentication data
   * @param {AuthContext} auth
   * @param {ScopeType} [scope='global']
   */
  static setAuth(auth, scope = 'global') {
    const context = SharedTestContext.getInstance();
    context.set('auth', auth, scope);
  }

  /**
   * Get authentication data
   * @param {ScopeType} [scope='global']
   * @returns {AuthContext | undefined}
   */
  static getAuth(scope = 'global') {
    const context = SharedTestContext.getInstance();
    return context.get('auth', scope);
  }

  /**
   * Store API response
   * @param {string} key
   * @param {ApiResponseContext} response
   * @param {ScopeType} [scope='global']
   */
  static setApiResponse(key, response, scope = 'global') {
    const context = SharedTestContext.getInstance();
    context.set(`apiResponse.${key}`, response, scope);
  }

  /**
   * Get API response
   * @param {string} key
   * @param {ScopeType} [scope='global']
   * @returns {ApiResponseContext | undefined}
   */
  static getApiResponse(key, scope = 'global') {
    const context = SharedTestContext.getInstance();
    return context.get(`apiResponse.${key}`, scope);
  }

  /**
   * Store user data
   * @param {UserContext} user
   * @param {ScopeType} [scope='global']
   */
  static setUser(user, scope = 'global') {
    const context = SharedTestContext.getInstance();
    context.set('user', user, scope);
  }

  /**
   * Get user data
   * @param {ScopeType} [scope='global']
   * @returns {UserContext | undefined}
   */
  static getUser(scope = 'global') {
    const context = SharedTestContext.getInstance();
    return context.get('user', scope);
  }

  /**
   * Store a resource ID
   * @param {string} resourceType
   * @param {string | number} id
   * @param {ScopeType} [scope='global']
   */
  static setResourceId(resourceType, id, scope = 'global') {
    const context = SharedTestContext.getInstance();
    context.set(`resourceIds.${resourceType}`, id, scope);
  }

  /**
   * Get a resource ID
   * @param {string} resourceType
   * @param {ScopeType} [scope='global']
   * @returns {string | number | undefined}
   */
  static getResourceId(resourceType, scope = 'global') {
    const context = SharedTestContext.getInstance();
    return context.get(`resourceIds.${resourceType}`, scope);
  }
}

module.exports = {
  SharedTestContext,
  ContextHelpers,
  sharedContext
};