/**
 * Action Dictionary
 * 
 * Maps natural language synonyms to canonical action verbs.
 * This ensures deterministic execution regardless of how users phrase their steps.
 * 
 * ARCHITECTURE CONTRACT:
 * - All verbs map to canonical actions supported by UIEngine
 * - Synonyms preserve human readability
 * - Runtime always executes canonical verbs
 */

const ACTION_DICTIONARY = {
  // Navigation actions
  navigate: ['navigate', 'go', 'goto', 'open', 'visit', 'browse to'],
  
  // Input/typing actions
  fill: ['fill', 'enter', 'type', 'input', 'write', 'set', 'search'],
  
  // Click actions
  click: ['click', 'tap', 'press', 'select', 'hit', 'push'],
  
  // Checkbox actions
  check: ['check', 'tick', 'mark', 'enable'],
  uncheck: ['uncheck', 'untick', 'unmark', 'disable'],
  
  // Dropdown/select actions
  select: ['select', 'choose', 'pick'],
  
  // Wait actions
  wait: ['wait', 'wait for', 'pause', 'delay'],
  
  // Keyboard actions
  press: ['press key', 'hit key', 'keyboard'],
  
  // Flow control
  include: ['include', 'run', 'execute', 'call'],
};

/**
 * Get canonical action from synonym
 * @param {string} verb - User-provided verb
 * @returns {string|null} - Canonical action or null if not found
 */
function getCanonicalAction(verb) {
  if (!verb || typeof verb !== 'string') {
    return null;
  }

  const normalized = verb.trim().toLowerCase();

  // Direct match (already canonical)
  if (ACTION_DICTIONARY[normalized]) {
    return normalized;
  }

  // Search synonyms
  for (const [canonical, synonyms] of Object.entries(ACTION_DICTIONARY)) {
    if (synonyms.includes(normalized)) {
      return canonical;
    }
  }

  return null;
}

/**
 * Check if an action is valid (exists in dictionary)
 * @param {string} action
 * @returns {boolean}
 */
function isValidAction(action) {
  return getCanonicalAction(action) !== null;
}

/**
 * Get all supported canonical actions
 * @returns {string[]}
 */
function getCanonicalActions() {
  return Object.keys(ACTION_DICTIONARY);
}

/**
 * Get all synonyms for a canonical action
 * @param {string} canonicalAction
 * @returns {string[]}
 */
function getSynonyms(canonicalAction) {
  return ACTION_DICTIONARY[canonicalAction] || [];
}

module.exports = {
  ACTION_DICTIONARY,
  getCanonicalAction,
  isValidAction,
  getCanonicalActions,
  getSynonyms,
};