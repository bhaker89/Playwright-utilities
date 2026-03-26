const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { logger } = require('../../utils/base/logger');

/**
 * Parses Postman Collection v2.1 and converts to Platform YAML
 */
class PostmanParser {
    constructor() {
        this.collection = null;
    }

    /**
     * Parse a Postman Collection file
     * @param {string} filePath 
     * @returns {Object} Converted Platform Test Suite
     */
    parse(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            this.collection = JSON.parse(content);

            if (!this.collection.info || !this.collection.item) {
                throw new Error('Invalid Postman Collection format. Expected v2.1 structure.');
            }

            const suiteName = this.collection.info.name || 'Imported Postman Collection';
            const tests = this._processItems(this.collection.item);

            return {
                name: suiteName,
                description: this.collection.info.description || 'Imported from Postman',
                tests: tests
            };

        } catch (error) {
            logger.error(`Failed to parse Postman collection: ${filePath}`, error);
            throw error;
        }
    }

    /**
     * Recursively process items (requests/folders)
     * @param {Array} items 
     * @returns {Array} Flat list of test cases
     */
    _processItems(items) {
        let tests = [];

        for (const item of items) {
            if (item.item) {
                // It's a folder/group - recurse
                const groupTests = this._processItems(item.item);
                // Optionally prefix test names with folder name
                groupTests.forEach(t => t.name = `${item.name} > ${t.name}`);
                tests = tests.concat(groupTests);
            } else if (item.request) {
                // It's a request
                const testCase = this._convertRequest(item);
                tests.push(testCase);
            }
        }

        return tests;
    }

    /**
     * Convert individual Postman request to Test Case
     * @param {Object} item 
     * @returns {Object} Platform Test Case
     */
    _convertRequest(item) {
        const req = item.request;

        // Extract URL
        let url = '';
        if (typeof req.url === 'string') {
            url = req.url;
        } else if (req.url?.raw) {
            url = req.url.raw;
        }

        // Handle variables in URL {{var}} -> ${var}
        url = url.replace(/{{([^}]+)}}/g, '${$1}');

        const testCase = {
            name: item.name,
            type: 'api', // Detected as API
            method: req.method || 'GET',
            url: url,
            headers: this._extractHeaders(req.header),
            assertions: [] // Default empty, we'll try to extract basic ones
        };

        // Extract Body
        if (req.body?.mode === 'raw') {
            try {
                testCase.body = JSON.parse(req.body.raw);
            } catch (e) {
                testCase.body = req.body.raw; // Keep as string if not JSON
            }
        } else if (req.body?.mode === 'urlencoded') {
            // Handle form data if needed
            testCase.body = req.body.urlencoded;
        }

        // Try to extract basic assertions from 'event' (test scripts)
        // This is a heuristic - we look for simple patterns
        const assertions = this._extractAssertions(item.event);
        if (assertions.length > 0) {
            testCase.assertions = assertions;
        } else {
            // Add default status check
            testCase.assertions.push({
                type: 'status_code',
                expected: 200
            });
        }

        return testCase;
    }

    _extractHeaders(headers) {
        if (!Array.isArray(headers)) return {};
        const extracted = {};
        headers.forEach(h => {
            if (h.key && h.value && !h.disabled) {
                extracted[h.key] = h.value.replace(/{{([^}]+)}}/g, '${$1}');
            }
        });
        return extracted;
    }

    /**
     * Heuristic to extract assertions from JS code
     * @param {Array} events 
     */
    _extractAssertions(events) {
        const assertions = [];
        if (!events) return assertions;

        const testScript = events.find(e => e.listen === 'test');
        if (!testScript || !testScript.script || !testScript.script.exec) return assertions;

        const scriptLines = testScript.script.exec.join('\n');

        // Check for Status Code 200
        if (scriptLines.includes('pm.response.to.have.status(200)')) {
            assertions.push({ type: 'status_code', expected: 200 });
        }
        else if (scriptLines.includes('pm.response.to.have.status(201)')) {
            assertions.push({ type: 'status_code', expected: 201 });
        }

        // Check for basic response time
        if (scriptLines.includes('pm.response.responseTime') && scriptLines.includes('200')) {
            assertions.push({ type: 'response_time', max_ms: 200 });
        }

        return assertions;
    }
}

module.exports = { PostmanParser };
