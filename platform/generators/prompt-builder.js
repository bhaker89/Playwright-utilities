const fs = require('fs');
const { logger } = require('../../utils/base/logger');

/**
 * ============================================================================
 * PROMPT BUILDER - Build Optimized LLM Prompts
 * ============================================================================
 * 
 * Builds comprehensive prompts for LLM test code generation including:
 * - OpenAPI specification
 * - Framework context and patterns
 * - Example tests
 * - Code style guidelines
 * 
 * USAGE:
 * ------
 * ```javascript
 * const builder = new PromptBuilder();
 * const prompt = builder.buildTestGenerationPrompt({
 *   openApiSpec: '...',
 *   context: { ... },
 *   helperInfo: { ... }
 * });
 * ```
 * ============================================================================
 */

class PromptBuilder {
  /**
   * Build test generation prompt
   * @param {Object} options
   * @param {string} options.openApiSpec - OpenAPI YAML content
   * @param {Object} options.context - Framework context from ContextGatherer
   * @param {Object} options.helperInfo - Helper class/method info
   * @param {string} options.serviceName - Service name
   * @param {string} options.apiName - API name
   * @returns {string} Complete prompt for LLM
   */
  buildTestGenerationPrompt(options) {
    const { openApiSpec, context, helperInfo, serviceName, apiName } = options;

    logger.info('  Building LLM prompt...');

    const prompt = `
# Task: Generate Playwright API Test Code

You are an expert Playwright test automation engineer. Generate a complete, production-ready API test file based on the provided OpenAPI specification and framework context.

## API Specification

\`\`\`yaml
${this._truncateSpec(openApiSpec)}
\`\`\`

## Service Information

- **Service Name**: ${serviceName}
- **API Name**: ${apiName}
- **Helper Class**: ${helperInfo.helperClass}
- **Helper Method**: ${helperInfo.methodName}()
- **Helper File**: ${helperInfo.filePath}

## Framework Context

### Available Fixtures

${this._formatFixtures(context.fixturePatterns)}

### Import Patterns

${this._formatImportPatterns(context.importPatterns)}

### Example Tests (for reference)

${this._formatExampleTests(context.exampleTests)}

### Common Assertion Patterns

${this._formatAssertionPatterns(context.assertionPatterns)}

## Requirements

1. **File Structure**:
   - Use describe/test blocks
   - Group related tests logically
   - Add clear test descriptions

2. **Imports**:
   - Import test and expect from fixtures/base-test
   - Import helper class: const { ${helperInfo.helperClass} } = require('../../../services/${serviceName}/${serviceName}-helper');

3. **Test Implementation**:
   - Use the apiClient fixture
   - Call the helper method: await ${helperInfo.helperClass}.${helperInfo.methodName}(apiClient, payload)
   - Add comprehensive assertions based on OpenAPI response schema
   - Include positive and negative test cases
   - Add descriptive test names

4. **Code Style**:
   - Use single quotes
   - Use 2-space indentation
   - Add semicolons
   - Add JSDoc comments for complex logic
   - Use async/await (no promises/callbacks)

5. **Assertions**:
   - Verify response status code
   - Verify response body structure
   - Verify required properties exist
   - Verify data types match schema
   - Add business logic assertions

## Output Format

Generate ONLY the complete JavaScript test file content. Do not include any explanations, markdown, or code fences around the output. Start directly with the imports.

## Example Structure

\`\`\`javascript
const { test, expect } = require('../../../fixtures/base-test');
const { ${helperInfo.helperClass} } = require('../../../services/${serviceName}/${serviceName}-helper');

test.describe('${this._formatTestSuiteName(apiName)}', () => {
  test('should successfully ${apiName.replace(/-/g, ' ')}', async ({ apiClient }) => {
    // Arrange
    const payload = {
      // Based on OpenAPI spec
    };

    // Act
    const response = await ${helperInfo.helperClass}.${helperInfo.methodName}(apiClient, payload);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    // More assertions based on schema
  });

  test('should handle invalid input', async ({ apiClient }) => {
    // Test negative cases
  });
});
\`\`\`

Now generate the complete test file:
`;

    logger.info('  ✓ Prompt built successfully');
    logger.info(`  Prompt length: ${prompt.length} characters`);

    return prompt;
  }

  /**
   * Format fixtures for prompt
   * @private
   */
  _formatFixtures(fixtures) {
    if (!fixtures || fixtures.length === 0) {
      return '- apiClient: API request context\n- sharedContext: Shared test data';
    }

    return fixtures.map(f => `- ${f.name}: Use as ${f.usage}`).join('\n');
  }

  /**
   * Format import patterns
   * @private
   */
  _formatImportPatterns(patterns) {
    if (!patterns || patterns.length === 0) {
      return '```javascript\nconst { test, expect } = require("../fixtures/base-test");\n```';
    }

    return patterns.map(p => `\`\`\`javascript\n${p.pattern}\n\`\`\``).join('\n\n');
  }

  /**
   * Format example tests
   * @private
   */
  _formatExampleTests(examples) {
    if (!examples || examples.length === 0) {
      return 'No example tests available. Follow Playwright best practices.';
    }

    return examples.map(ex =>
      `### ${ex.fileName}\n\n\`\`\`javascript\n${ex.content}\n\`\`\``
    ).join('\n\n');
  }

  /**
   * Format assertion patterns
   * @private
   */
  _formatAssertionPatterns(patterns) {
    if (!patterns || patterns.length === 0) {
      return '- expect(response.status).toBe(200);\n- expect(response.body).toHaveProperty("id");';
    }

    return patterns.map(p =>
      `### ${p.type.charAt(0).toUpperCase() + p.type.slice(1)} Assertions\n\n` +
      p.examples.map(ex => `- \`${ex}\``).join('\n')
    ).join('\n\n');
  }

  /**
   * Truncate OpenAPI spec if it's too large
   * @private
   */
  _truncateSpec(spec, maxLines = 1000) {
    const lines = spec.split('\n');
    if (lines.length <= maxLines) return spec;

    logger.warn(`  ⚠️  OpenAPI spec is very large (${lines.length} lines). Truncating to ${maxLines} lines for LLM.`);
    return lines.slice(0, maxLines).join('\n') + '\n# ... (rest of spec truncated to stay within token limits) ...';
  }

  /**
   * Format test suite name
   * @private
   */
  _formatTestSuiteName(apiName) {
    return apiName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' API';
  }
}

module.exports = { PromptBuilder };