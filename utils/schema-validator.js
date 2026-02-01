const Joi = require('joi');
const { logger } = require('./logger');

/**
 * Schema Validator for API Response validation
 * Ensures data contracts between microservices are maintained
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {string[]} [errors]
 * @property {any} [value]
 */

/**
 * Schema Validator class
 */
class SchemaValidator {
  /**
   * Validate data against a Joi schema
   * @param {any} data
   * @param {import('joi').Schema} schema
   * @returns {ValidationResult}
   */
  static validate(data, schema) {
    const result = schema.validate(data, { abortEarly: false });

    if (result.error) {
      const errors = result.error.details.map(detail => detail.message);
      logger.error('Schema validation failed', { errors });
      return {
        isValid: false,
        errors,
      };
    }

    logger.info('Schema validation passed');
    return {
      isValid: true,
      value: result.value,
    };
  }

  /**
   * Validate API response structure
   * @template T
   * @param {any} response
   * @param {import('joi').Schema} expectedSchema
   * @returns {ValidationResult}
   */
  static validateResponse(response, expectedSchema) {
    return this.validate(response, expectedSchema);
  }

  /**
   * Assert schema validation (throws error if invalid)
   * @param {any} data
   * @param {import('joi').Schema} schema
   * @returns {void}
   */
  static assertValid(data, schema) {
    const result = this.validate(data, schema);
    if (!result.isValid) {
      throw new Error(`Schema validation failed: ${result.errors?.join(', ')}`);
    }
  }
}

/**
 * Common schema definitions for microservices
 * Extensible for 100+ services
 */
class CommonSchemas {
  /**
   * User schema
   * @type {import('joi').ObjectSchema}
   */
  static user = Joi.object({
    id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phone: Joi.string().optional(),
    createdAt: Joi.string().isoDate().optional(),
    updatedAt: Joi.string().isoDate().optional(),
  });

  /**
   * Product schema
   * @type {import('joi').ObjectSchema}
   */
  static product = Joi.object({
    id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    name: Joi.string().required(),
    description: Joi.string().optional(),
    price: Joi.number().positive().required(),
    category: Joi.string().required(),
    sku: Joi.string().required(),
    inStock: Joi.boolean().required(),
    quantity: Joi.number().min(0).required(),
  });

  /**
   * Order schema
   * @type {import('joi').ObjectSchema}
   */
  static order = Joi.object({
    id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    userId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    orderDate: Joi.string().isoDate().required(),
    status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled').required(),
    total: Joi.number().positive().required(),
    items: Joi.array().items(CommonSchemas.product).min(1).required(),
  });

  /**
   * Paginated response schema
   * @param {import('joi').Schema} itemSchema
   * @returns {import('joi').ObjectSchema}
   */
  static paginatedResponse(itemSchema) {
    return Joi.object({
      data: Joi.array().items(itemSchema).required(),
      pagination: Joi.object({
        page: Joi.number().min(1).required(),
        pageSize: Joi.number().min(1).required(),
        totalPages: Joi.number().min(0).required(),
        totalItems: Joi.number().min(0).required(),
      }).required(),
    });
  }

  /**
   * Error response schema
   * @type {import('joi').ObjectSchema}
   */
  static errorResponse = Joi.object({
    error: Joi.object({
      code: Joi.string().required(),
      message: Joi.string().required(),
      details: Joi.any().optional(),
    }).required(),
    status: Joi.number().required(),
    timestamp: Joi.string().isoDate().optional(),
  });

  /**
   * Health check response schema
   * @type {import('joi').ObjectSchema}
   */
  static healthCheck = Joi.object({
    status: Joi.string().valid('healthy', 'unhealthy', 'degraded').required(),
    service: Joi.string().required(),
    timestamp: Joi.string().isoDate().required(),
    dependencies: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        status: Joi.string().valid('up', 'down').required(),
      })
    ).optional(),
  });
}

/**
 * Order Nexus API Schema Definitions
 * Validates responses from Order Nexus microservice
 */
class OrderNexusSchemas {
  /**
   * Create or Update Order Response Schema
   * Expected response for POST /order_nexus/v1/orders/create_or_update_order
   * @type {import('joi').ObjectSchema}
   */
  static createOrUpdateOrderResponse = Joi.object({
    status: Joi.string().valid('success', 'failure', 'error').required(),
    message: Joi.string().required(),
    order_id: Joi.string().required(),
    timestamp: Joi.string().isoDate().required(),
  }).options({ allowUnknown: true }); // Allow additional fields from API

  /**
   * Order Nexus Error Response Schema
   * @type {import('joi').ObjectSchema}
   */
  static errorResponse = Joi.object({
    status: Joi.string().valid('error', 'failure').required(),
    message: Joi.string().required(),
    error_code: Joi.string().optional(),
    details: Joi.any().optional(),
    timestamp: Joi.string().isoDate().optional(),
  }).options({ allowUnknown: true });

  /**
   * Create Order Request Payload Schema
   * Validates the request payload structure
   * @type {import('joi').ObjectSchema}
   */
  static createOrderRequestPayload = Joi.object({
    order_type: Joi.string().valid('PHARMA', 'DIAGNOSTIC', 'CONSULT').required(),
    order_id: Joi.string().required(),
    group_order_id: Joi.string().required(),
    user_id: Joi.string().uuid().required(),
    triggered_at: Joi.string().isoDate().required(),
    event: Joi.object({
      event_name: Joi.string().required(),
      sub_event_name: Joi.string().optional(),
      event_type: Joi.string().required(),
      description: Joi.string().optional(),
      triggered_at: Joi.string().isoDate().required(),
      received_at: Joi.string().isoDate().optional(),
    }).required(),
    order_details: Joi.object({
      basic_order_details: Joi.object({
        order_id: Joi.string().required(),
        group_order_id: Joi.string().required(),
        source: Joi.string().required(),
        platform: Joi.object({
          name: Joi.string().required(),
          version: Joi.string().required(),
        }).required(),
      }).required(),
      user_details: Joi.object({
        user_id: Joi.string().uuid().required(),
        email: Joi.string().email().required(),
        contact_number: Joi.string().pattern(/^\+\d{10,15}$/).required(),
      }).required(),
      status: Joi.object({
        id: Joi.string().required(),
        title: Joi.string().required(),
        sub_title: Joi.string().optional(),
      }).required(),
      tags: Joi.array().items(Joi.string()).optional(),
      extra_attributes: Joi.object().optional(),
    }).required(),
  });
}

module.exports = {
  SchemaValidator,
  CommonSchemas,
  OrderNexusSchemas,
};