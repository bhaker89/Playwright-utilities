const { expect } = require('@playwright/test');
const { PostgresClient } = require('./postgres-client');
const { MongoDBClient } = require('./mongo-client');

/**
 * Database Assertion Helpers
 * Provides reusable assertion methods for database validation
 */
class DatabaseAssertions {
  /**
   * PostgreSQL Assertions
   */
  static postgres = {
    /**
     * Assert record exists in PostgreSQL
     * @param {PostgresClient} client
     * @param {string} table
     * @param {string} condition
     * @param {any[]} [params]
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertRecordExists(client, table, condition, params, message) {
      const exists = await client.exists(table, condition, params);
      expect(exists, message || `Record should exist in ${table}`).toBe(true);
    },

    /**
     * Assert record does not exist in PostgreSQL
     * @param {PostgresClient} client
     * @param {string} table
     * @param {string} condition
     * @param {any[]} [params]
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertRecordNotExists(client, table, condition, params, message) {
      const exists = await client.exists(table, condition, params);
      expect(exists, message || `Record should not exist in ${table}`).toBe(false);
    },

    /**
     * Assert record count matches expected
     * @param {PostgresClient} client
     * @param {string} table
     * @param {number} expectedCount
     * @param {string} [condition]
     * @param {any[]} [params]
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertRecordCount(client, table, expectedCount, condition, params, message) {
      const count = await client.count(table, condition, params);
      expect(count, message || `Record count in ${table} should be ${expectedCount}`).toBe(expectedCount);
    },

    /**
     * Assert field value matches expected
     * @template T
     * @param {PostgresClient} client
     * @param {string} table
     * @param {string} field
     * @param {any} expectedValue
     * @param {string} condition
     * @param {any[]} [params]
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertFieldValue(client, table, field, expectedValue, condition, params, message) {
      const query = `SELECT ${field} FROM ${table} WHERE ${condition}`;
      const result = await client.queryOne(query, params);

      expect(result, `Record should exist in ${table}`).not.toBeNull();
      expect(result[field], message || `Field ${field} should equal ${expectedValue}`).toBe(expectedValue);
    },

    /**
     * Assert query result matches expected data
     * @template T
     * @param {PostgresClient} client
     * @param {string} query
     * @param {T[]} expectedData
     * @param {any[]} [params]
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertQueryResult(client, query, expectedData, params, message) {
      const result = await client.query(query, params);
      expect(result.success, 'Query should execute successfully').toBe(true);
      expect(result.rows, message || 'Query result should match expected data').toEqual(expectedData);
    },

    /**
     * Assert data consistency between UI/API and database
     * @template T
     * @param {PostgresClient} client
     * @param {T} uiOrApiData
     * @param {string} dbQuery
     * @param {any[]} [params]
     * @param {(keyof T)[]} [fieldsToCompare]
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertDataConsistency(client, uiOrApiData, dbQuery, params, fieldsToCompare, message) {
      const dbRecord = await client.queryOne(dbQuery, params);

      expect(dbRecord, 'Database record should exist').not.toBeNull();

      if (fieldsToCompare) {
        fieldsToCompare.forEach(field => {
          expect(
            uiOrApiData[field],
            message || `Field ${String(field)} should match between UI/API and DB`
          ).toEqual(dbRecord[field]);
        });
      } else {
        expect(uiOrApiData, message || 'Data should be consistent').toEqual(dbRecord);
      }
    },
  };

  /**
   * MongoDB Assertions
   */
  static mongodb = {
    /**
     * Assert document exists in MongoDB
     * @template {import('mongodb').Document} T
     * @param {MongoDBClient} client
     * @param {string} collection
     * @param {import('mongodb').Filter<T>} filter
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertDocumentExists(client, collection, filter, message) {
      const exists = await client.exists(collection, filter);
      expect(exists, message || `Document should exist in ${collection}`).toBe(true);
    },

    /**
     * Assert document does not exist in MongoDB
     * @template {import('mongodb').Document} T
     * @param {MongoDBClient} client
     * @param {string} collection
     * @param {import('mongodb').Filter<T>} filter
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertDocumentNotExists(client, collection, filter, message) {
      const exists = await client.exists(collection, filter);
      expect(exists, message || `Document should not exist in ${collection}`).toBe(false);
    },

    /**
     * Assert document count matches expected
     * @template {import('mongodb').Document} T
     * @param {MongoDBClient} client
     * @param {string} collection
     * @param {number} expectedCount
     * @param {import('mongodb').Filter<T>} [filter]
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertDocumentCount(client, collection, expectedCount, filter, message) {
      const count = await client.count(collection, filter);
      expect(count, message || `Document count in ${collection} should be ${expectedCount}`).toBe(expectedCount);
    },

    /**
     * Assert field value matches expected
     * @template {import('mongodb').Document} T
     * @param {MongoDBClient} client
     * @param {string} collection
     * @param {keyof T} field
     * @param {any} expectedValue
     * @param {import('mongodb').Filter<T>} filter
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertFieldValue(client, collection, field, expectedValue, filter, message) {
      const document = await client.findOne(collection, filter);

      expect(document, `Document should exist in ${collection}`).not.toBeNull();
      expect(document[field], message || `Field ${String(field)} should equal ${expectedValue}`).toBe(expectedValue);
    },

    /**
     * Assert query result matches expected data
     * @template {import('mongodb').Document} T
     * @param {MongoDBClient} client
     * @param {string} collection
     * @param {import('mongodb').Filter<T>} filter
     * @param {T[]} expectedData
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertQueryResult(client, collection, filter, expectedData, message) {
      const documents = await client.find(collection, filter);
      expect(documents, message || 'Query result should match expected data').toEqual(expectedData);
    },

    /**
     * Assert data consistency between UI/API and database
     * @template {import('mongodb').Document} T
     * @param {MongoDBClient} client
     * @param {Partial<T>} uiOrApiData
     * @param {string} collection
     * @param {import('mongodb').Filter<T>} filter
     * @param {(keyof T)[]} [fieldsToCompare]
     * @param {string} [message]
     * @returns {Promise<void>}
     */
    async assertDataConsistency(client, uiOrApiData, collection, filter, fieldsToCompare, message) {
      const dbDocument = await client.findOne(collection, filter);

      expect(dbDocument, 'Database document should exist').not.toBeNull();

      if (fieldsToCompare) {
        fieldsToCompare.forEach(field => {
          expect(
            uiOrApiData[field],
            message || `Field ${String(field)} should match between UI/API and DB`
          ).toEqual(dbDocument[field]);
        });
      } else {
        // Compare only the fields present in uiOrApiData
        Object.keys(uiOrApiData).forEach(key => {
          const field = key;
          expect(
            uiOrApiData[field],
            message || `Field ${String(field)} should match between UI/API and DB`
          ).toEqual(dbDocument[field]);
        });
      }
    },
  };
}

module.exports = { DatabaseAssertions };