/**
 * Database utilities - Central export point
 */

const { DatabaseClient, ConnectionStatus } = require('./db-client.base');
const { PostgresClient } = require('./postgres-client');
const { MongoDBClient } = require('./mongo-client');
const { DatabaseClientFactory, DatabaseType } = require('./db-client-factory');
const { DatabaseAssertions } = require('./db-assertions');

module.exports = {
  // Base classes
  DatabaseClient,
  ConnectionStatus,
  
  // Client implementations
  PostgresClient,
  MongoDBClient,
  
  // Factory
  DatabaseClientFactory,
  DatabaseType,
  
  // Assertions
  DatabaseAssertions,
};