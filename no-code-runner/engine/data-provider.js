const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

/**
 * Data Provider - Loads test data from CSV and JSON files
 */
class DataProvider {
  /**
   * Load test data from file
   * @param {string} filePath - Path to data file (CSV or JSON)
   * @returns {Promise<Array<Object>>} Array of data rows
   */
  async loadData(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Data file not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.csv':
        return this.loadCsv(filePath);
      case '.json':
        return this.loadJson(filePath);
      default:
        throw new Error(`Unsupported data file format: ${ext}. Use .csv or .json`);
    }
  }

  /**
   * Load data from CSV file
   * @private
   * @param {string} filePath - Path to CSV file
   * @returns {Array<Object>} Array of data rows
   */
  loadCsv(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      throw new Error(`CSV file is empty: ${filePath}`);
    }

    return records;
  }

  /**
   * Load data from JSON file
   * @private
   * @param {string} filePath - Path to JSON file
   * @returns {Array<Object>} Array of data rows
   */
  loadJson(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    try {
      const data = JSON.parse(fileContent);

      // Handle both array format and object with data property
      if (Array.isArray(data)) {
        return data;
      } else if (data.data && Array.isArray(data.data)) {
        return data.data;
      } else {
        throw new Error('JSON file must contain an array or object with "data" array property');
      }
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error.message}`);
    }
  }

  /**
   * Validate data structure
   * @param {Array<Object>} data - Data rows to validate
   * @param {Array<string>} requiredFields - Required field names
   * @returns {boolean} True if valid
   */
  validateData(data, requiredFields = []) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    if (requiredFields.length > 0) {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        for (const field of requiredFields) {
          if (!(field in row)) {
            throw new Error(`Row ${i + 1} is missing required field: ${field}`);
          }
        }
      }
    }

    return true;
  }

  /**
   * Filter data rows based on condition
   * @param {Array<Object>} data - Data rows
   * @param {Function} condition - Filter function
   * @returns {Array<Object>} Filtered data rows
   */
  filterData(data, condition) {
    return data.filter(condition);
  }

  /**
   * Transform data rows
   * @param {Array<Object>} data - Data rows
   * @param {Function} transformer - Transform function
   * @returns {Array<Object>} Transformed data rows
   */
  transformData(data, transformer) {
    return data.map(transformer);
  }
}

module.exports = { DataProvider };