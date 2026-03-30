const SelectorStabilityEvaluator = require('../../framework/locator-intelligence/selector-stability-evaluator');

function escapeCssAttr(value) {
  // Very small helper; CSS.escape isn't available in Node in all versions.
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function primaryToSelectorString(primary) {
  if (!primary || typeof primary !== 'object') return null;

  const { type, value } = primary;

  switch (type) {
    case 'testid':
      // Works with UIEngine (page.locator) and is equivalent to getByTestId in most cases.
      return `[data-testid="${escapeCssAttr(value)}"]`;

    case 'text':
      // Playwright text engine
      return `text=${String(value || '')}`;

    case 'label':
      // Not natively supported as a string selector engine by Playwright.
      // We approximate with text= for now; if you want real getByLabel, UIEngine must be extended.
      return `text=${String(value || '')}`;

    case 'role': {
      // CandidateExtractor stores role as { role, options: { name, exact } }
      // There is no stable string form for getByRole that page.locator understands.
      // We approximate using text selector on the role name.
      const name = value?.options?.name || value?.name || '';
      return `text=${String(name)}`;
    }

    case 'xpath':
      return String(value || '').startsWith('xpath=') ? String(value) : `xpath=${String(value || '')}`;

    case 'css':
    default:
      return String(value || '');
  }
}

function fallbackToSelectorStrings(fallbackList) {
  if (!Array.isArray(fallbackList)) return [];
  return fallbackList
    .map(f => primaryToSelectorString(f))
    .filter(Boolean);
}

function resolveRegistryEntryToSelectorStrings(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const primarySelector = primaryToSelectorString(entry.primary);
  const fallbackSelectors = fallbackToSelectorStrings(entry.fallback);

  if (!primarySelector) return null;

  return {
    primarySelector,
    fallbackSelectors,

    // Pass-through metadata for debugging/telemetry if needed.
    confidence: entry.confidence,
    entropy: entry.entropy,
    lastValidated: entry.lastValidated,
  };
}

module.exports = {
  resolveRegistryEntryToSelectorStrings,
  primaryToSelectorString,
  fallbackToSelectorStrings,
};