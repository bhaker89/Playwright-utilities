const fs = require('fs');
const path = require('path');
const { logger } = require('../../utils/base/logger');

/**
 * ============================================================================
 * CONTEXT GATHERER - Gather Framework Patterns for LLM
 * ============================================================================
 * 
 * Gathers context from existing codebase to help LLM generate better tests:
 * - Example test files
 * - Fixture usage patterns
 * - Import patterns
 * - Assertion patterns
 * - Helper method usage
 * 
 * USAGE:
 * ------
 * ```javascript
 * const gatherer = new ContextGatherer();
 * const context = await gatherer.gatherContext('payment-service');
 * ```
 * ============================================================================
 */

class ContextGatherer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.testsDir = path.join(this.projectRoot, 'tests/api');
    this.fixturesDir = path.join(this.projectRoot, 'fixtures');
    this.utilsDir = path.join(this.projectRoot, 'utils');
  }

  /**
   * Gather framework context for LLM prompt
   * @param {string} serviceName - Service name for context
   * @returns {Promise<Object>} Context object
   */
  async gatherContext(serviceName) {
    logger.info('  Gathering framework context...');

    const context = {
      exampleTests: await this._getExampleTests(serviceName),
      fixturePatterns: await this._getFixturePatterns(),
      importPatterns: await this._getImportPatterns(),
      assertionPatterns: await this._getAssertionPatterns(),
      helperMethods: await this._getHelperMethods(serviceName),
      projectStructure: this._getProjectStructure()
    };

    logger.info(`  ✓ Context gathered:`);
    logger.info(`    - Example tests: ${context.exampleTests.length}`);
    logger.info(`    - Fixture patterns: ${context.fixturePatterns.length}`);
    logger.info(`    - Import patterns: ${context.importPatterns.length}`);

    return context;
  }

  /**
   * Get example test files
   * @private
   */
  async _getExampleTests(serviceName) {
    const examples = [];

    try {
      // Try to find tests for the same service
      const serviceTestDir = path.join(this.testsDir, serviceName);
      
      if (fs.existsSync(serviceTestDir)) {
        const files = fs.readdirSync(serviceTestDir)
          .filter(f => f.endsWith('.spec.js'))
          .slice(0, 2); // Get max 2 examples

        for (const file of files) {
          const filePath = path.join(serviceTestDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          examples.push({
            fileName: file,
            content: this._truncateContent(content, 500)
          });
        }
      }

      // If no service-specific tests, get generic API tests
      if (examples.length === 0) {
        const genericTests = this._findGenericApiTests();
        examples.push(...genericTests.slice(0, 2));
      }

    } catch (error) {
      logger.warn(`  Could not load example tests: ${error.message}`);
    }

    return examples;
  }

  /**
   * Find generic API test examples
   * @private
   */
  _findGenericApiTests() {
    const examples = [];

    try {
      if (fs.existsSync(this.testsDir)) {
        const entries = fs.readdirSync(this.testsDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const dirPath = path.join(this.testsDir, entry.name);
            const files = fs.readdirSync(dirPath)
              .filter(f => f.endsWith('.spec.js'))
              .slice(0, 1);

            for (const file of files) {
              const filePath = path.join(dirPath, file);
              const content = fs.readFileSync(filePath, 'utf8');
              
              examples.push({
                fileName: `${entry.name}/${file}`,
                content: this._truncateContent(content, 500)
              });

              if (examples.length >= 2) break;
            }
          }
          
          if (examples.length >= 2) break;
        }
      }
    } catch (error) {
      logger.warn(`  Could not load generic tests: ${error.message}`);
    }

    return examples;
  }

  /**
   * Get fixture usage patterns
   * @private
   */
  async _getFixturePatterns() {
    const patterns = [];

    try {
      const baseTestPath = path.join(this.fixturesDir, 'base-test.js');
      
      if (fs.existsSync(baseTestPath)) {
        const content = fs.readFileSync(baseTestPath, 'utf8');
        
        // Extract fixture names
        const fixtureMatches = content.match(/(\w+):\s*async\s*\(/g);
        
        if (fixtureMatches) {
          fixtureMatches.forEach(match => {
            const fixtureName = match.match(/(\w+):/)[1];
            patterns.push({
              name: fixtureName,
              usage: `{ ${fixtureName} }`
            });
          });
        }
      }
    } catch (error) {
      logger.warn(`  Could not load fixture patterns: ${error.message}`);
    }

    // Add default patterns if none found
    if (patterns.length === 0) {
      patterns.push(
        { name: 'apiClient', usage: '{ apiClient }' },
        { name: 'sharedContext', usage: '{ sharedContext }' }
      );
    }

    return patterns;
  }

  /**
   * Get import patterns
   * @private
   */
  async _getImportPatterns() {
    return [
      {
        type: 'base-test',
        pattern: "const { test, expect } = require('../../../fixtures/base-test');"
      },
      {
        type: 'logger',
        pattern: "const { logger } = require('../../../utils/base/logger');"
      },
      {
        type: 'helper',
        pattern: "const { ServiceHelper } = require('../../../services/service-name/service-helper');"
      }
    ];
  }

  /**
   * Get assertion patterns
   * @private
   */
  async _getAssertionPatterns() {
    return [
      {
        type: 'status',
        examples: [
          'expect(response.status).toBe(200);',
          'expect(response.status).toBe(201);',
          'expect(response.ok).toBeTruthy();'
        ]
      },
      {
        type: 'property',
        examples: [
          'expect(response.body).toHaveProperty("id");',
          'expect(response.body.id).toBeDefined();'
        ]
      },
      {
        type: 'value',
        examples: [
          'expect(response.body.status).toBe("success");',
          'expect(response.body.amount).toBe(100);'
        ]
      },
      {
        type: 'array',
        examples: [
          'expect(Array.isArray(response.body.items)).toBeTruthy();',
          'expect(response.body.items.length).toBeGreaterThan(0);'
        ]
      }
    ];
  }

  /**
   * Get helper methods for service
   * @private
   */
  async _getHelperMethods(serviceName) {
    const methods = [];

    try {
      const helperPath = path.join(
        this.projectRoot,
        'services',
        serviceName,
        `${serviceName}-helper.js`
      );

      if (fs.existsSync(helperPath)) {
        const content = fs.readFileSync(helperPath, 'utf8');
        
        // Extract method names
        const methodMatches = content.matchAll(/static\s+async\s+(\w+)\s*\(/g);
        
        for (const match of methodMatches) {
          methods.push({
            name: match[1],
            usage: `await ServiceHelper.${match[1]}(apiContext, payload)`
          });
        }
      }
    } catch (error) {
      logger.warn(`  Could not load helper methods: ${error.message}`);
    }

    return methods;
  }

  /**
   * Get project structure info
   * @private
   */
  _getProjectStructure() {
    return {
      testLocation: 'tests/api/{service-name}/{api-name}.spec.js',
      fixtureLocation: 'fixtures/base-test.js',
      helperLocation: 'services/{service-name}/{service-name}-helper.js',
      utilsLocation: 'utils/',
      style: {
        indentation: '  ', // 2 spaces
        quotes: 'single',
        semicolons: true
      }
    };
  }

  /**
   * Truncate content to max lines
   * @private
   */
  _truncateContent(content, maxLines) {
    const lines = content.split('\n');
    
    if (lines.length <= maxLines) {
      return content;
    }

    return lines.slice(0, maxLines).join('\n') + '\n// ... truncated ...';
  }
}

module.exports = { ContextGatherer };