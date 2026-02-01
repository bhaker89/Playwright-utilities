const { Pool } = require('pg');
const { DatabaseClient, ConnectionStatus } = require('./db-client.base');

/**
 * PostgreSQL Database Client
 * Implements connection pooling and transaction support
 */
class PostgresClient extends DatabaseClient {
  /**
   * @param {import('../../config/environment.config').PostgresConfig} config
   */
  constructor(config) {
    super('PostgreSQL');
    /** @private @type {import('pg').Pool | null} */
    this.pool = null;
    /** @private @type {import('../../config/environment.config').PostgresConfig} */
    this.config = config;
  }

  /** @private @type {PostgresClient | null} */
  static instance = null;

  /**
   * Get singleton instance (optional - can also create new instances)
   * @param {import('../../config/environment.config').PostgresConfig} config
   * @returns {PostgresClient}
   */
  static getInstance(config) {
    if (!PostgresClient.instance) {
      PostgresClient.instance = new PostgresClient(config);
    }
    return PostgresClient.instance;
  }

  /**
   * Connect to PostgreSQL database with connection pooling
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.connectionStatus === ConnectionStatus.CONNECTED) {
      this.log('Already connected');
      return;
    }

    try {
      this.connectionStatus = ConnectionStatus.CONNECTING;
      this.log(`Connecting to ${this.config.host}:${this.config.port}/${this.config.database}`);

      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
        max: this.config.maxPoolSize || 10,
        idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis || 5000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.connectionStatus = ConnectionStatus.CONNECTED;
      this.log('Successfully connected');
    } catch (error) {
      this.connectionStatus = ConnectionStatus.ERROR;
      this.log(`Connection failed: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Disconnect from PostgreSQL database
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.pool) {
      try {
        this.log('Closing connection pool');
        await this.pool.end();
        this.pool = null;
        this.connectionStatus = ConnectionStatus.DISCONNECTED;
        this.log('Connection pool closed');
      } catch (error) {
        this.log(`Error closing connection: ${error}`, 'error');
        throw error;
      }
    }
  }

  /**
   * Execute a query with parameters
   * @template T
   * @param {string} queryText
   * @param {any[]} [params]
   * @returns {Promise<import('./db-client.base').QueryResult<T>>}
   */
  async query(queryText, params) {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const startTime = Date.now();
    this.log(`Executing query: ${queryText.substring(0, 100)}...`);

    try {
      const result = await this.pool.query(queryText, params);
      const executionTime = Date.now() - startTime;

      this.log(`Query executed successfully in ${executionTime}ms. Rows: ${result.rowCount}`);

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        fields: result.fields,
        success: true,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.log(`Query failed: ${error}`, 'error');

      return {
        rows: [],
        rowCount: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  /**
   * Execute multiple queries in a transaction
   * @template T
   * @param {import('./db-client.base').TransactionCallback<T>} callback
   * @returns {Promise<T>}
   */
  async transaction(callback) {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const client = await this.pool.connect();
    this.log('Starting transaction');

    try {
      await client.query('BEGIN');
      const result = await callback();
      await client.query('COMMIT');
      this.log('Transaction committed');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.log(`Transaction rolled back: ${error}`, 'error');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Execute a SELECT query and return first row
   * @template T
   * @param {string} queryText
   * @param {any[]} [params]
   * @returns {Promise<T | null>}
   */
  async queryOne(queryText, params) {
    const result = await this.query(queryText, params);
    return result.rows && result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Helper: Execute INSERT/UPDATE/DELETE and return affected row count
   * @param {string} queryText
   * @param {any[]} [params]
   * @returns {Promise<number>}
   */
  async execute(queryText, params) {
    const result = await this.query(queryText, params);
    return result.rowCount || 0;
  }

  /**
   * Helper: Check if a record exists
   * @param {string} table
   * @param {string} condition
   * @param {any[]} [params]
   * @returns {Promise<boolean>}
   */
  async exists(table, condition, params) {
    const query = `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${condition}) as exists`;
    const result = await this.queryOne(query, params);
    return result?.exists || false;
  }

  /**
   * Helper: Get count of records
   * @param {string} table
   * @param {string} [condition]
   * @param {any[]} [params]
   * @returns {Promise<number>}
   */
  async count(table, condition, params) {
    const query = condition 
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${condition}`
      : `SELECT COUNT(*) as count FROM ${table}`;
    const result = await this.queryOne(query, params);
    return parseInt(result?.count || '0');
  }
}

module.exports = { PostgresClient };