const { DatabaseClient } = require('./db-client.base');
const { PostgresClient } = require('./postgres-client');
const { MongoDBClient } = require('./mongo-client');
const { env } = require('../../config/environment.config');

/**
 * Database type enum
 * @typedef {'POSTGRES' | 'MONGODB'} DatabaseType
 */

/**
 * @readonly
 * @enum {DatabaseType}
 */
const DatabaseType = {
  POSTGRES: 'POSTGRES',
  MONGODB: 'MONGODB',
};

/**
 * Database Client Factory
 * Creates appropriate database client based on type
 */
class DatabaseClientFactory {
  /**
   * Create a database client
   * @param {DatabaseType} type
   * @returns {DatabaseClient}
   */
  static createClient(type) {
    switch (type) {
      case DatabaseType.POSTGRES:
        if (!env.postgres) {
          throw new Error('PostgreSQL configuration not found in environment');
        }
        return new PostgresClient(env.postgres);

      case DatabaseType.MONGODB:
        if (!env.mongodb) {
          throw new Error('MongoDB configuration not found in environment');
        }
        return new MongoDBClient(env.mongodb);

      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  /**
   * Create a PostgreSQL client (convenience method)
   * @returns {PostgresClient}
   */
  static createPostgresClient() {
    return this.createClient(DatabaseType.POSTGRES);
  }

  /**
   * Create a MongoDB client (convenience method)
   * @returns {MongoDBClient}
   */
  static createMongoDBClient() {
    return this.createClient(DatabaseType.MONGODB);
  }
}

module.exports = {
  DatabaseClientFactory,
  DatabaseType,
};