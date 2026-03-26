const { MongoClient } = require('mongodb');
const { DatabaseClient, ConnectionStatus } = require('./db-client.base');

/**
 * MongoDB Database Client
 * Implements connection pooling and session-based transactions
 */
class MongoDBClient extends DatabaseClient {
  /**
   * @param {import('../../config/environment.config').MongoDBConfig} config
   */
  constructor(config) {
    super('MongoDB');
    /** @private @type {import('mongodb').MongoClient | null} */
    this.client = null;
    /** @private @type {import('mongodb').Db | null} */
    this.db = null;
    /** @private @type {import('../../config/environment.config').MongoDBConfig} */
    this.config = config;
  }

  /** @private @type {MongoDBClient | null} */
  static instance = null;

  /**
   * Get singleton instance (optional - can also create new instances)
   * @param {import('../../config/environment.config').MongoDBConfig} config
   * @returns {MongoDBClient}
   */
  static getInstance(config) {
    if (!MongoDBClient.instance) {
      MongoDBClient.instance = new MongoDBClient(config);
    }
    return MongoDBClient.instance;
  }

  /**
   * Connect to MongoDB database
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.connectionStatus === ConnectionStatus.CONNECTED) {
      this.log('Already connected');
      return;
    }

    try {
      this.connectionStatus = ConnectionStatus.CONNECTING;
      this.log(`Connecting to MongoDB: ${this.config.database}`);

      this.client = new MongoClient(this.config.uri, this.config.options);
      await this.client.connect();

      // Test connection
      await this.client.db('admin').command({ ping: 1 });

      this.db = this.client.db(this.config.database);
      this.connectionStatus = ConnectionStatus.CONNECTED;
      this.log('Successfully connected');
    } catch (error) {
      this.connectionStatus = ConnectionStatus.ERROR;
      this.log(`Connection failed: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB database
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.client) {
      try {
        this.log('Closing connection');
        await this.client.close();
        this.client = null;
        this.db = null;
        this.connectionStatus = ConnectionStatus.DISCONNECTED;
        this.log('Connection closed');
      } catch (error) {
        this.log(`Error closing connection: ${error}`, 'error');
        throw error;
      }
    }
  }

  /**
   * Execute a query (MongoDB uses different query paradigm)
   * This is a generic wrapper - use specific methods for better type safety
   * @template T
   * @param {string} collectionName
   * @param {string} operation
   * @param {any[]} [params]
   * @returns {Promise<import('./db-client.base').QueryResult<T>>}
   */
  async query(collectionName, operation, params) {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const startTime = Date.now();
    this.log(`Executing ${operation} on collection: ${collectionName}`);

    try {
      const collection = this.db.collection(collectionName);
      let result;

      // Basic operation routing
      switch (operation.toLowerCase()) {
        case 'find':
          result = await collection.find(params?.[0] || {}).toArray();
          break;
        case 'findone':
          result = [await collection.findOne(params?.[0] || {})].filter(Boolean);
          break;
        case 'insert':
          result = await collection.insertOne(params?.[0] || {});
          break;
        case 'insertmany':
          result = await collection.insertMany(params?.[0] || []);
          break;
        case 'update':
          result = await collection.updateOne(params?.[0] || {}, params?.[1] || {});
          break;
        case 'updatemany':
          result = await collection.updateMany(params?.[0] || {}, params?.[1] || {});
          break;
        case 'delete':
          result = await collection.deleteOne(params?.[0] || {});
          break;
        case 'deletemany':
          result = await collection.deleteMany(params?.[0] || {});
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      const executionTime = Date.now() - startTime;
      this.log(`Operation completed in ${executionTime}ms`);

      return {
        rows: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1,
        success: true,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.log(`Operation failed: ${error}`, 'error');

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
   * Execute operations in a transaction (requires MongoDB replica set)
   * @template T
   * @param {import('./db-client.base').TransactionCallback<T>} callback
   * @returns {Promise<T>}
   */
  async transaction(callback) {
    if (!this.client) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const session = this.client.startSession();
    this.log('Starting transaction session');

    try {
      session.startTransaction();
      const result = await callback();
      await session.commitTransaction();
      this.log('Transaction committed');
      return result;
    } catch (error) {
      await session.abortTransaction();
      this.log(`Transaction aborted: ${error}`, 'error');
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get a collection reference
   * @template {import('mongodb').Document} T
   * @param {string} collectionName
   * @returns {import('mongodb').Collection<T>}
   */
  getCollection(collectionName) {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db.collection(collectionName);
  }

  /**
   * Helper: Find documents
   * @template {import('mongodb').Document} T
   * @param {string} collectionName
   * @param {import('mongodb').Filter<T>} [filter={}]
   * @returns {Promise<T[]>}
   */
  async find(collectionName, filter = {}) {
    const collection = this.getCollection(collectionName);
    return await collection.find(filter).toArray();
  }

  /**
   * Helper: Find one document
   * @template {import('mongodb').Document} T
   * @param {string} collectionName
   * @param {import('mongodb').Filter<T>} filter
   * @returns {Promise<T | null>}
   */
  async findOne(collectionName, filter) {
    const collection = this.getCollection(collectionName);
    return await collection.findOne(filter);
  }

  /**
   * Helper: Count documents
   * @template {import('mongodb').Document} T
   * @param {string} collectionName
   * @param {import('mongodb').Filter<T>} [filter={}]
   * @returns {Promise<number>}
   */
  async count(collectionName, filter = {}) {
    const collection = this.getCollection(collectionName);
    return await collection.countDocuments(filter);
  }

  /**
   * Helper: Check if document exists
   * @template {import('mongodb').Document} T
   * @param {string} collectionName
   * @param {import('mongodb').Filter<T>} filter
   * @returns {Promise<boolean>}
   */
  async exists(collectionName, filter) {
    const count = await this.count(collectionName, filter);
    return count > 0;
  }
}

module.exports = { MongoDBClient };