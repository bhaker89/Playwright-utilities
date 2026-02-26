const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { logger } = require('../../utils/base/logger');

/**
 * ============================================================================
 * OPENAPI GENERATOR - Generate OpenAPI 3.0 Specifications
 * ============================================================================
 * 
 * Generates OpenAPI 3.0 spec from actual API execution results.
 * This spec becomes the SOURCE OF TRUTH for the API.
 * 
 * Location: services/{service-name}/apis/{api-name}/openapi.yaml
 * 
 * USAGE:
 * ------
 * ```javascript
 * const generator = new OpenApiGenerator();
 * const specPath = await generator.generate({
 *   serviceName: 'payment-service',
 *   apiName: 'process-payment',
 *   request: { method: 'POST', url: '/v1/payments', ... },
 *   response: { status: 201, body: { id: '123' }, ... }
 * });
 * ```
 * ============================================================================
 */

class OpenApiGenerator {
  constructor() {
    this.servicesDir = path.resolve(__dirname, '../../services');
  }

  /**
   * Generate OpenAPI 3.0 specification
   * @param {Object} options
   * @param {string} options.serviceName - Service name
   * @param {string} options.apiName - API name
   * @param {Object} options.request - Request data
   * @param {Object} options.response - Response data
   * @returns {Promise<string>} Path to generated OpenAPI spec
   */
  async generate(options) {
    const { serviceName, apiName, request, response } = options;

    // 1. Create API directory
    const apiDir = path.join(
      this.servicesDir,
      serviceName,
      'apis',
      apiName
    );

    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
      logger.info(`  Created API directory: ${apiDir}`);
    }

    // 2. Generate OpenAPI spec object
    const openApiSpec = this._buildOpenApiSpec(serviceName, apiName, request, response);

    // 3. Save as YAML
    const specPath = path.join(apiDir, 'openapi.yaml');
    const yamlContent = yaml.dump(openApiSpec, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });

    fs.writeFileSync(specPath, yamlContent, 'utf8');
    logger.info(`  Saved OpenAPI spec: ${specPath}`);

    // 4. Also save metadata
    await this._saveMetadata(apiDir, request, response);

    return specPath;
  }

  /**
   * Build OpenAPI 3.0 specification object
   * @private
   */
  _buildOpenApiSpec(serviceName, apiName, request, response) {
    const { method, url, headers, body } = request;
    const path = this._extractPath(url);

    // Build spec
    const spec = {
      openapi: '3.0.0',
      info: {
        title: `${this._formatName(apiName)} API`,
        description: `Auto-generated OpenAPI spec for ${serviceName}/${apiName}`,
        version: '1.0.0',
        'x-generated-at': new Date().toISOString(),
        'x-service': serviceName,
        'x-api-name': apiName
      },
      servers: [
        {
          url: this._extractBaseUrl(url),
          description: 'API Server'
        }
      ],
      paths: {}
    };

    // Build path object
    spec.paths[path] = {};
    spec.paths[path][method.toLowerCase()] = this._buildOperation(
      method,
      apiName,
      headers,
      body,
      response
    );

    // Add components/schemas if needed
    if (body || response.body) {
      spec.components = {
        schemas: this._buildSchemas(body, response.body)
      };
    }

    return spec;
  }

  /**
   * Build operation object
   * @private
   */
  _buildOperation(method, apiName, headers, requestBody, response) {
    const operation = {
      summary: this._formatName(apiName),
      description: `${method} ${apiName} operation`,
      operationId: this._getOperationId(method, apiName),
      tags: [apiName.split('-')[0]]
    };

    // Add request body if present
    if (requestBody && Object.keys(requestBody).length > 0) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: this._inferSchema(requestBody, 'Request')
          }
        }
      };
    }

    // Add responses
    operation.responses = this._buildResponses(response);

    return operation;
  }

  /**
   * Build responses object
   * @private
   */
  _buildResponses(response) {
    const responses = {};
    const statusCode = String(response.status);

    responses[statusCode] = {
      description: this._getStatusDescription(response.status),
      content: {}
    };

    // Add response body schema
    if (response.body) {
      const contentType = response.headers['content-type'] || 'application/json';
      
      responses[statusCode].content[contentType] = {
        schema: this._inferSchema(response.body, 'Response')
      };
    }

    // Add common error responses
    if (response.status >= 200 && response.status < 300) {
      responses['400'] = {
        description: 'Bad Request'
      };
      responses['401'] = {
        description: 'Unauthorized'
      };
      responses['500'] = {
        description: 'Internal Server Error'
      };
    }

    return responses;
  }

  /**
   * Infer JSON schema from object
   * @private
   */
  _inferSchema(obj, schemaName) {
    if (!obj || typeof obj !== 'object') {
      return { type: 'string' };
    }

    if (Array.isArray(obj)) {
      return {
        type: 'array',
        items: obj.length > 0 ? this._inferSchema(obj[0], `${schemaName}Item`) : { type: 'object' }
      };
    }

    const schema = {
      type: 'object',
      properties: {},
      required: []
    };

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      schema.properties[key] = this._inferPropertySchema(value);
      
      // Mark as required if value is present
      if (value !== null && value !== undefined) {
        schema.required.push(key);
      }
    });

    return schema;
  }

  /**
   * Infer property schema
   * @private
   */
  _inferPropertySchema(value) {
    if (value === null || value === undefined) {
      return { type: 'string', nullable: true };
    }

    if (Array.isArray(value)) {
      return {
        type: 'array',
        items: value.length > 0 ? this._inferPropertySchema(value[0]) : { type: 'object' }
      };
    }

    const type = typeof value;

    switch (type) {
      case 'string':
        return { type: 'string', example: value };
      case 'number':
        return Number.isInteger(value)
          ? { type: 'integer', example: value }
          : { type: 'number', example: value };
      case 'boolean':
        return { type: 'boolean', example: value };
      case 'object':
        return this._inferSchema(value, 'NestedObject');
      default:
        return { type: 'string' };
    }
  }

  /**
   * Build schemas for components
   * @private
   */
  _buildSchemas(requestBody, responseBody) {
    const schemas = {};

    if (requestBody) {
      schemas.RequestBody = this._inferSchema(requestBody, 'RequestBody');
    }

    if (responseBody) {
      schemas.ResponseBody = this._inferSchema(responseBody, 'ResponseBody');
    }

    return schemas;
  }

  /**
   * Save metadata JSON file
   * @private
   */
  async _saveMetadata(apiDir, request, response) {
    const metadata = {
      generatedAt: new Date().toISOString(),
      request: {
        method: request.method,
        url: request.url,
        hasHeaders: !!(request.headers && Object.keys(request.headers).length > 0),
        hasBody: !!request.body
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        time: response.time,
        contentType: response.headers['content-type'] || 'unknown'
      }
    };

    const metadataPath = path.join(apiDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    logger.info(`  Saved metadata: ${metadataPath}`);
  }

  /**
   * Extract path from URL
   * @private
   */
  _extractPath(url) {
    if (url.startsWith('/')) {
      return url;
    }

    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch (error) {
      return '/';
    }
  }

  /**
   * Extract base URL
   * @private
   */
  _extractBaseUrl(url) {
    if (url.startsWith('/')) {
      return 'http://localhost:3000';
    }

    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch (error) {
      return 'http://localhost:3000';
    }
  }

  /**
   * Format name for display
   * @private
   */
  _formatName(name) {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get operation ID
   * @private
   */
  _getOperationId(method, apiName) {
    return `${method.toLowerCase()}_${apiName.replace(/-/g, '_')}`;
  }

  /**
   * Get status description
   * @private
   */
  _getStatusDescription(status) {
    const descriptions = {
      200: 'Successful operation',
      201: 'Resource created successfully',
      204: 'No content',
      400: 'Bad request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Resource not found',
      500: 'Internal server error'
    };

    return descriptions[status] || 'Response';
  }
}

module.exports = { OpenApiGenerator };