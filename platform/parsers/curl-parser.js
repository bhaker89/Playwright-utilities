const curlconverter = require('curlconverter');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { logger } = require('../../utils/base/logger');

/**
 * Automates the conversion of CURL commands to No-Code YAML tests
 */
class CurlParser {
  /**
   * Convert a CURL command string to a Platform Test Case
   * @param {string} curlCommand 
   * @param {string} testName 
   * @returns {Object} 
   */
  parseCommand(curlCommand, testName = 'Imported CURL Test') {
    try {
      logger.info(`Parsing CURL command: ${testName}`);

      // Convert CURL to JavaScript (Playwright/Node structure)
      const converted = curlconverter.toNode(curlCommand);

      // Extract components (basic implementation)
      // Note: For a more robust solution, we'd parse the 'converted' string deeper
      // or use curlconverter.toInternal() if available.
      // Here we use a heuristic approach for the YAML structure.

      const methodMatch = curlCommand.match(/-X\s+([A-Z]+)/i) || curlCommand.match(/--request\s+([A-Z]+)/i);
      const method = methodMatch ? methodMatch[1] : (curlCommand.includes('--data') || curlCommand.includes('-d') ? 'POST' : 'GET');

      const urlMatch = curlCommand.match(/'(https?:\/\/[^']+)'/) || curlCommand.match(/"(https?:\/\/[^"]+)"/);
      const url = urlMatch ? urlMatch[1] : '';

      const testCase = {
        name: testName,
        type: 'api',
        method: method,
        url: url,
        headers: this._extractHeaders(curlCommand),
        assertions: [
          { type: 'status_code', expected: 200 },
          { type: 'response_time', max_ms: 2000 }
        ]
      };

      // Extract Data
      const dataMatch = curlCommand.match(/-d\s+'([^']+)'/) || curlCommand.match(/--data\s+'([^']+)'/) ||
        curlCommand.match(/-d\s+"([^"]+)"/) || curlCommand.match(/--data\s+"([^"]+)"/);
      if (dataMatch) {
        try {
          testCase.body = JSON.parse(dataMatch[1]);
        } catch (e) {
          testCase.body = dataMatch[1];
        }
      }

      return testCase;
    } catch (error) {
      logger.error('Failed to parse CURL command', error);
      throw error;
    }
  }

  _extractHeaders(curl) {
    const headers = {};
    const headerMatches = curl.matchAll(/-H\s+'([^']+)'/g);
    for (const match of headerMatches) {
      const [key, ...valueParts] = match[1].split(':');
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(':').trim();
      }
    }
    return headers;
  }

  /**
   * Save the parsed test to a YAML file
   * @param {Object} testCase 
   * @param {string} outputPath 
   */
  saveToYaml(testCase, outputPath) {
    const suite = {
      name: testCase.name,
      description: `Generated from CURL at ${new Date().toISOString()}`,
      tests: [testCase]
    };

    const yamlContent = yaml.dump(suite);
    fs.writeFileSync(outputPath, yamlContent);
    logger.info(`Test saved to: ${outputPath}`);
  }
}

module.exports = { CurlParser };