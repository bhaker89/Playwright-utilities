const { logger } = require('../logger');

/**
 * Database connection status
 * @typedef {'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'} ConnectionStatus
 */

/**
 * @readonly
 * @enum {ConnectionStatus}
 */
const ConnectionStatus = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
};

/**
 * Query result interface
 * @typedef {Object} QueryResult
 * @template T
 * @property {T[]} [rows]
 * @property {number} [rowCount]
 * @property {any[]} [fields]
 * @property {boolean} success
 * @property {string} [error]
 * @property {number} [executionTime]
 */

/**
 * Transaction callback function
 * @template T
 * @typedef {() => Promise<T>} TransactionCallback
 */

/**
 * Abstract base class for database clients
 * Provides common interface for different database implementations
 */
class DatabaseClient {
  /**
   * @param {string} clientType
   */
  constructor(clientType) {
    /** @protected @type {ConnectionStatus} */
    this.connectionStatus = ConnectionStatus.DISCONNECTED;
    /** @protected @type {string} */
    this.clientType = clientType;
  }

  /**
   * Connect to the database
   * @abstract
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Disconnect from the database
   * @abstract
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  /**
   * Execute a query
   * @abstract
   * @template T
   * @param {string} query
   * @param {any[]} [params]
   * @returns {Promise<QueryResult<T>>}
   */
  async query(query, params) {
    throw new Error('query() must be implemented by subclass');
  }

  /**
   * Execute multiple queries in a transaction (optional, for databases that support it)
   * @abstract
   * @template T
   * @param {TransactionCallback<T>} callback
   * @returns {Promise<T>}
   */
  async transaction(callback) {
    throw new Error('transaction() must be implemented by subclass');
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connectionStatus === ConnectionStatus.CONNECTED;
  }

  /**
   * Get connection status
   * @returns {ConnectionStatus}
   */
  getStatus() {
    return this.connectionStatus;
  }

  /**
   * Get client type
   * @returns {string}
   */
  getClientType() {
    return this.clientType;
  }

  /**
   * Log database operation
   * @protected
   * @param {string} message
   * @param {'info' | 'error' | 'warn'} [level='info']
   * @returns {void}
   */
  log(message, level = 'info') {
    const logMessage = `[${this.clientType}] ${message}`;
    logger[level](logMessage);
  }
}

module.exports = {
  DatabaseClient,
  ConnectionStatus,
};