/**
 * Tokenizer
 * 
 * Breaks natural language DSL steps into structured components:
 * - verb: the action to perform
 * - object: the target element
 * - modifier: connecting words (with, to, for, etc.)
 * - value: the value/data to use
 * 
 * Example:
 *   Input: "fill email with test@example.com"
 *   Output: { verb: "fill", object: "email", modifier: "with", value: "test@example.com" }
 * 
 * IMPORTANT: This is purely structural parsing. NO registry lookup happens here.
 */

const MODIFIERS = ['with', 'to', 'for', 'on', 'from', 'by', 'using', 'as', 'at'];

/**
 * Extract quoted string from text
 * @param {string} text
 * @returns {Object|null} - { value, rest } or null if no quotes
 */
function extractQuotedValue(text) {
  const singleQuoteMatch = text.match(/^'([^']*)'(.*)$/);
  if (singleQuoteMatch) {
    return {
      value: singleQuoteMatch[1],
      rest: singleQuoteMatch[2].trim(),
    };
  }

  const doubleQuoteMatch = text.match(/^"([^"]*)"(.*)$/);
  if (doubleQuoteMatch) {
    return {
      value: doubleQuoteMatch[1],
      rest: doubleQuoteMatch[2].trim(),
    };
  }

  return null;
}

/**
 * Tokenize a natural language step into components
 * @param {string} step - Natural language step
 * @returns {Object} - Tokenized components
 */
function tokenize(step) {
  if (!step || typeof step !== 'string') {
    throw new Error('Tokenizer: step must be a non-empty string');
  }

  const trimmed = step.trim();
  if (!trimmed) {
    throw new Error('Tokenizer: step cannot be empty');
  }

  // Handle "include" directive specially (flow composition)
  if (trimmed.toLowerCase().startsWith('include ')) {
    const flowName = trimmed.substring(8).trim();
    return {
      verb: 'include',
      object: flowName,
      modifier: null,
      value: null,
      raw: trimmed,
    };
  }

  // Handle navigation specially (URLs often have spaces)
  if (trimmed.toLowerCase().startsWith('navigate to ') || 
      trimmed.toLowerCase().startsWith('go to ') ||
      trimmed.toLowerCase().startsWith('goto ') ||
      trimmed.toLowerCase().startsWith('open ')) {
    
    let verb, rest;
    if (trimmed.toLowerCase().startsWith('navigate to ')) {
      verb = 'navigate';
      rest = trimmed.substring(12).trim();
    } else if (trimmed.toLowerCase().startsWith('go to ')) {
      verb = 'go';
      rest = trimmed.substring(6).trim();
    } else if (trimmed.toLowerCase().startsWith('goto ')) {
      verb = 'goto';
      rest = trimmed.substring(5).trim();
    } else {
      verb = 'open';
      rest = trimmed.substring(5).trim();
    }

    return {
      verb,
      object: null,
      modifier: 'to',
      value: rest,
      raw: trimmed,
    };
  }

  // Handle "wait for" specially (two-word verb)
  if (trimmed.toLowerCase().startsWith('wait for ')) {
    const target = trimmed.substring(9).trim();
    return {
      verb: 'wait',
      object: target,
      modifier: 'for',
      value: null,
      raw: trimmed,
    };
  }

  // Standard tokenization: verb + object + [modifier + value]
  const words = trimmed.split(/\s+/);
  
  if (words.length === 0) {
    throw new Error('Tokenizer: failed to parse empty step');
  }

  const verb = words[0].toLowerCase();
  
  // Find modifier position
  let modifierIndex = -1;
  for (let i = 1; i < words.length; i++) {
    if (MODIFIERS.includes(words[i].toLowerCase())) {
      modifierIndex = i;
      break;
    }
  }

  let object, modifier, value;

  if (modifierIndex === -1) {
    // No modifier: "click login button" or "wait"
    if (words.length === 1) {
      object = null;
      modifier = null;
      value = null;
    } else {
      object = words.slice(1).join(' ');
      modifier = null;
      value = null;
    }
  } else {
    // Has modifier: "fill email with test@example.com"
    object = words.slice(1, modifierIndex).join(' ');
    modifier = words[modifierIndex].toLowerCase();
    
    // Check for quoted value
    const afterModifier = words.slice(modifierIndex + 1).join(' ');
    const quoted = extractQuotedValue(afterModifier);
    
    if (quoted) {
      value = quoted.value; // Use unquoted value
    } else {
      value = afterModifier; // Use as-is
    }
  }

  return {
    verb: verb || null,
    object: object || null,
    modifier: modifier || null,
    value: value || null,
    raw: trimmed,
  };
}

/**
 * Tokenize multiple steps
 * @param {string[]} steps - Array of natural language steps
 * @returns {Object[]} - Array of tokenized components
 */
function tokenizeMany(steps) {
  if (!Array.isArray(steps)) {
    throw new Error('Tokenizer: steps must be an array');
  }

  return steps.map((step, index) => {
    try {
      return tokenize(step);
    } catch (err) {
      throw new Error(`Tokenizer: failed at step ${index + 1}: ${err.message}`);
    }
  });
}

/**
 * Validate tokenized result
 * @param {Object} tokens
 * @returns {boolean}
 */
function isValidTokenization(tokens) {
  if (!tokens || typeof tokens !== 'object') {
    return false;
  }

  // Must have a verb
  if (!tokens.verb || typeof tokens.verb !== 'string') {
    return false;
  }

  // Other fields are optional but must be correct type when present
  if (tokens.object !== null && typeof tokens.object !== 'string') {
    return false;
  }
  if (tokens.modifier !== null && typeof tokens.modifier !== 'string') {
    return false;
  }
  if (tokens.value !== null && typeof tokens.value !== 'string') {
    return false;
  }

  return true;
}

module.exports = {
  tokenize,
  tokenizeMany,
  isValidTokenization,
  extractQuotedValue,
  MODIFIERS,
};