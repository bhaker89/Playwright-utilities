const fs = require('fs');
const yaml = require('js-yaml');
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

    logger.info('  Building optimized LLM prompts...');

    const systemPrompt = `You are an expert Playwright SDET.
Generate production-ready API tests following these strict rules:
1. Use describe/test blocks.
2. Import { test, expect } from fixtures/base-test.
3. Import helper: const { ${helperInfo.helperClass} } = require('../../../services/${serviceName}/${serviceName}-helper');
4. Use apiClient fixture and await ${helperInfo.helperClass}.${helperInfo.methodName}(apiClient, payload).
5. Assert status, body structure, types, and business logic.
6. Style: single quotes, 2-space indent, semicolons, async/await.
7. Output ONLY JavaScript code. No markdown, no explanations.`;

    const userPrompt = `
# API: ${apiName} (${serviceName})
# Spec:
\`\`\`yaml
${this._pruneSpec(openApiSpec, apiName)}
\`\`\`

# Context:
## Fixtures: ${this._formatFixtures(context.fixturePatterns)}
## Imports: ${this._formatImportPatterns(context.importPatterns)}
## Examples:
${this._formatExampleTests(context.exampleTests)}
## Assertions:
${this._formatAssertionPatterns(context.assertionPatterns)}

# Helper: ${helperInfo.helperClass}.${helperInfo.methodName}() in ${helperInfo.filePath}

# Goal: Generate the ${apiName}.spec.js file now. Start from imports.`;

    logger.info('  ✓ Prompt built (Optimized)');
    return { systemPrompt, userPrompt };
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
   * Intelligently prune OpenAPI spec to include only the target API and its schemas
   * @private
   */
  _pruneSpec(specContent, apiName) {
    try {
      const spec = yaml.load(specContent);
      if (!spec || !spec.paths) return specContent;

      // 1. Find the target operation
      let targetPath = null;
      let targetMethod = null;
      let targetOp = null;

      // Look for the operation that matches apiName or x-api-name
      for (const [pathKey, methods] of Object.entries(spec.paths)) {
        for (const [method, op] of Object.entries(methods)) {
          if (op['x-api-name'] === apiName || op.operationId === apiName || pathKey.includes(apiName)) {
            targetPath = pathKey;
            targetMethod = method;
            targetOp = op;
            break;
          }
        }
        if (targetOp) break;
      }

      // Fallback: if no clear match, use the first path (likely if it was generated per-API)
      if (!targetOp) {
        targetPath = Object.keys(spec.paths)[0];
        targetMethod = Object.keys(spec.paths[targetPath])[0];
        targetOp = spec.paths[targetPath][targetMethod];
      }

      const prunedSpec = {
        openapi: spec.openapi || '3.0.0',
        info: spec.info,
        servers: spec.servers,
        paths: {
          [targetPath]: {
            [targetMethod]: targetOp
          }
        },
        components: {
          schemas: {}
        }
      };

      // 2. Extract referenced schemas recursively
      const usedSchemas = new Set();
      const findRefs = (obj) => {
        if (!obj || typeof obj !== 'object') return;

        if (obj.$ref && typeof obj.$ref === 'string') {
          const schemaName = obj.$ref.split('/').pop();
          if (!usedSchemas.has(schemaName)) {
            usedSchemas.add(schemaName);
            if (spec.components && spec.components.schemas && spec.components.schemas[schemaName]) {
              findRefs(spec.components.schemas[schemaName]);
            }
          }
        }

        Object.values(obj).forEach(val => findRefs(val));
      };

      findRefs(targetOp);

      // Add found schemas to components
      if (spec.components && spec.components.schemas) {
        usedSchemas.forEach(schemaName => {
          if (spec.components.schemas[schemaName]) {
            prunedSpec.components.schemas[schemaName] = spec.components.schemas[schemaName];
          }
        });
      }

      const prunedContent = yaml.dump(prunedSpec, { indent: 2, lineWidth: -1 });

      const originalLines = specContent.split('\n').length;
      const prunedLines = prunedContent.split('\n').length;
      logger.info(`  ✓ OpenAPI pruned: ${originalLines} -> ${prunedLines} lines`);

      return prunedContent;
    } catch (error) {
      logger.warn(`  OpenAPI pruning failed: ${error.message}. Falling back to truncation.`);
      return this._truncateSpec(specContent);
    }
  }

  /**
   * Truncate OpenAPI spec if it's too large (Fallback)
   * @private
   */
  _truncateSpec(spec, maxLines = 1000) {
    const lines = spec.split('\n');
    if (lines.length <= maxLines) return spec;

    logger.warn(`  ⚠️  OpenAPI spec is very large (${lines.length} lines). Truncating to ${maxLines} lines for LLM.`);
    return lines.slice(0, maxLines).join('\n') + '\n# ... (rest of spec truncated) ...';
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