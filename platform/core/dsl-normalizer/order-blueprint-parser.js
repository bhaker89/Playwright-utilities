/**
 * Order Blueprint Parser
 * 
 * Parses order creation DSL commands into order blueprints
 * 
 * Syntax:
 *   create order type=<type> [key=value...]
 * 
 * Examples:
 *   create order type=rx
 *   create order type=rx prescription=false
 *   create order type=otc split=true
 *   create order type=mixed split=true discount=coupon source=paytm
 * 
 * Output: Order Blueprint Object
 *   {
 *     type: 'rx',
 *     prescription: false,
 *     split: true,
 *     discount: 'coupon',
 *     source: 'paytm',
 *     attributes: {}
 *   }
 */

/**
 * Check if step is an order creation command
 * @param {string} step - DSL step
 * @returns {boolean}
 */
function isOrderCreationCommand(step) {
  const normalized = step.toLowerCase().trim();
  return normalized.startsWith('create order') || normalized.startsWith('create an order');
}

/**
 * Parse order creation command into blueprint
 * 
 * @param {string} step - DSL step (e.g., "create order type=rx prescription=false")
 * @returns {Object} Order blueprint
 */
function parseOrderBlueprint(step) {
  if (!isOrderCreationCommand(step)) {
    throw new Error('Not an order creation command');
  }

  // Extract parameters after "create order"
  const commandPattern = /create (?:an )?order\s+(.+)/i;
  const match = step.match(commandPattern);

  if (!match) {
    throw new Error('Invalid order creation syntax. Expected: create order type=<type> [key=value...]');
  }

  const paramsString = match[1];
  const params = parseKeyValuePairs(paramsString);

  // Validate required fields
  if (!params.type) {
    throw new Error('Order type is required. Usage: create order type=<rx|otc|mixed|b2b|corporate>');
  }

  // Build blueprint
  const blueprint = buildBlueprint(params);

  console.log('[ORDER_BLUEPRINT_PARSER] Parsed blueprint:', JSON.stringify(blueprint, null, 2));

  return blueprint;
}

/**
 * Parse key=value pairs from string
 * @param {string} str - Parameter string
 * @returns {Object} Key-value pairs
 */
function parseKeyValuePairs(str) {
  const pairs = {};
  
  // Match key=value patterns
  const pattern = /(\w+)=(["']?)([^\s"']+)\2/g;
  let match;

  while ((match = pattern.exec(str)) !== null) {
    const key = match[1];
    let value = match[3];

    // Convert boolean strings
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    // Convert numeric strings
    else if (!isNaN(value) && value !== '') value = Number(value);

    pairs[key] = value;
  }

  return pairs;
}

/**
 * Build order blueprint from parsed parameters
 * @param {Object} params - Parsed parameters
 * @returns {Object} Order blueprint
 */
function buildBlueprint(params) {
  const {
    type,
    prescription,
    split,
    discount,
    source,
    payment,
    items,
    ...rest
  } = params;

  // Build blueprint with known fields
  const blueprint = {
    type,
    // Optional fields with defaults
    prescription: prescription !== undefined ? prescription : (type === 'rx' ? true : false),
    split: split || false,
    discount: discount || null,
    source: source || 'web',
    payment: payment || 'cod',
    // Custom attributes
    attributes: rest
  };

  // Handle items if provided
  if (items) {
    if (typeof items === 'string') {
      // Parse items string (simplified)
      blueprint.items = items.split(',').map(sku => ({ sku: sku.trim() }));
    } else {
      blueprint.items = items;
    }
  }

  return blueprint;
}

/**
 * Validate order blueprint
 * @param {Object} blueprint - Order blueprint
 * @returns {Object} Validation result { valid, errors }
 */
function validateBlueprint(blueprint) {
  const errors = [];

  // Check required fields
  if (!blueprint.type) {
    errors.push('Missing required field: type');
  }

  // Validate type
  const validTypes = ['rx', 'otc', 'mixed', 'b2b', 'corporate'];
  if (blueprint.type && !validTypes.includes(blueprint.type)) {
    errors.push(`Invalid order type: ${blueprint.type}. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate prescription logic
  if (blueprint.type === 'otc' && blueprint.prescription === true) {
    errors.push('OTC orders cannot require prescription');
  }

  // Validate boolean fields
  if (blueprint.prescription !== undefined && typeof blueprint.prescription !== 'boolean') {
    errors.push('prescription must be true or false');
  }

  if (blueprint.split !== undefined && typeof blueprint.split !== 'boolean') {
    errors.push('split must be true or false');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Parse and validate order creation command
 * @param {string} step - DSL step
 * @returns {Object} { blueprint, validation }
 */
function parseAndValidate(step) {
  const blueprint = parseOrderBlueprint(step);
  const validation = validateBlueprint(blueprint);

  if (!validation.valid) {
    console.warn('[ORDER_BLUEPRINT_PARSER] Validation warnings:', validation.errors);
  }

  return {
    blueprint,
    validation
  };
}

module.exports = {
  isOrderCreationCommand,
  parseOrderBlueprint,
  parseKeyValuePairs,
  buildBlueprint,
  validateBlueprint,
  parseAndValidate
};