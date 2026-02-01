const dotenv = require('dotenv');
const path = require('path');

/**
 * @typedef {Object} PostgresConfig
 * @property {string} host
 * @property {number} port
 * @property {string} database
 * @property {string} user
 * @property {string} password
 * @property {boolean} [ssl]
 * @property {number} [maxPoolSize]
 * @property {number} [idleTimeoutMillis]
 * @property {number} [connectionTimeoutMillis]
 */

/**
 * @typedef {Object} MongoDBOptions
 * @property {number} [maxPoolSize]
 * @property {number} [minPoolSize]
 * @property {number} [connectTimeoutMS]
 * @property {number} [socketTimeoutMS]
 */

/**
 * @typedef {Object} MongoDBConfig
 * @property {string} uri
 * @property {string} database
 * @property {MongoDBOptions} [options]
 */

/**
 * @typedef {Object} EnvironmentConfig
 * @property {string} testEnv
 * @property {string} baseURL
 * @property {string} uiBaseURL
 * @property {string} apiBaseURL
 * @property {string} authUsername
 * @property {string} authPassword
 * @property {string} apiKey
 * @property {string} [dbHost] - Legacy DB config (for backward compatibility)
 * @property {number} [dbPort] - Legacy DB config (for backward compatibility)
 * @property {string} [dbName] - Legacy DB config (for backward compatibility)
 * @property {string} [dbUser] - Legacy DB config (for backward compatibility)
 * @property {string} [dbPassword] - Legacy DB config (for backward compatibility)
 * @property {PostgresConfig} [postgres] - PostgreSQL configuration
 * @property {MongoDBConfig} [mongodb] - MongoDB configuration
 * @property {string} orderNexusBaseURL - Order Nexus base URL
 * @property {string} orderNexusToken - Order Nexus authentication token
 * @property {string} orderNexusApiVersion - Order Nexus API version
 */

/**
 * Load environment configuration based on TEST_ENV variable
 * @returns {EnvironmentConfig} The loaded environment configuration
 */
function loadEnvironment() {
  const environment = process.env.TEST_ENV || 'dev';
  const envPath = path.resolve(__dirname, `.env.${environment}`);

  dotenv.config({ path: envPath });

  return {
    testEnv: process.env.TEST_ENV || 'dev',
    baseURL: process.env.BASE_URL || 'https://example.com',
    uiBaseURL: process.env.UI_BASE_URL || process.env.BASE_URL || 'https://steve.1mg.com',
    apiBaseURL: process.env.API_BASE_URL || 'https://api.example.com',
    authUsername: process.env.AUTH_USERNAME || '',
    authPassword: process.env.AUTH_PASSWORD || '',
    apiKey: process.env.API_KEY || '',
    // Legacy DB config (for backward compatibility)
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: parseInt(process.env.DB_PORT || '5432'),
    dbName: process.env.DB_NAME || 'test_db',
    dbUser: process.env.DB_USER || 'test_user',
    dbPassword: process.env.DB_PASSWORD || '',
    // PostgreSQL configuration
    postgres: {
      host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
      database: process.env.POSTGRES_DB || process.env.DB_NAME || 'test_db',
      user: process.env.POSTGRES_USER || process.env.DB_USER || 'test_user',
      password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || '',
      ssl: process.env.POSTGRES_SSL === 'true',
      maxPoolSize: parseInt(process.env.POSTGRES_MAX_POOL_SIZE || '10'),
      idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '5000'),
    },
    // MongoDB configuration
    mongodb: {
      uri: process.env.MONGO_URI || 
           (process.env.MONGO_HOST 
             ? `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT || '27017'}`
             : 'mongodb://localhost:27017'
           ),
      database: process.env.MONGO_DB || 'test_db',
      options: {
        maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '10'),
        minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '2'),
        connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT || '10000'),
        socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000'),
      },
    },
    // Order Nexus configuration
    orderNexusBaseURL: process.env.ORDER_NEXUS_BASE_URL || process.env.API_BASE_URL || 'https://staginternalapi.1mg.com',
    orderNexusToken: process.env.STAG_ORDER_NEXUS_TOKEN || '',
    orderNexusApiVersion: process.env.ORDER_NEXUS_API_VERSION || 'v1',
  };
}

/**
 * Global environment configuration instance
 * @type {EnvironmentConfig}
 */
const env = loadEnvironment();

module.exports = {
  loadEnvironment,
  env
};