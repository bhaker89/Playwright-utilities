# SECTION 5 — How Locators Are Resolved

This framework supports multiple “locator sources” depending on execution mode:

- **Code-first locators**: `page.locator('...')`, `page.getByRole(...)` inside page objects
- **Registry locators**: YAML entries in `locator-registry/services/**`
- **Map registry alternatives**: `framework/locator-intelligence/locator-map.json`

---

## 5.1 Primary vs fallback locators (registry YAML)

A service locator entry typically looks like:

```yaml
quick_order_button:
  primary:
    type: css
    value: a[href*="/done-in-one/prescription-order"]
  fallback:
    - type: text
      value: Quick order
```

**Primary** is the intended stable selector.

**Fallbacks** exist because:

- UI changes often happen gradually
- different environments render slightly different DOM
- a stable attribute may appear later

Registry resolution is implemented by:

- loader: `platform/core/locator-registry-loader.js`
- resolver: `platform/core/locator-registry-resolver.js`

---

## 5.2 Entropy scoring (selector stability)

Entropy is a penalty score for fragile selectors.

Implemented in:

- `framework/locator-intelligence/selector-stability-evaluator.js`

Examples of high entropy:

- deep CSS chains
- `nth-child` selectors
- absolute XPath
- positional pseudo-classes

Entropy is used in:

- `framework/locator-intelligence/locator-ranker.js`

---

## 5.3 Confidence scoring

Confidence is a composite score used for decision-making and future automation.

Implemented in:

- `framework/locator-intelligence/confidence-engine.js`

Current formula (from code):

```text
confidence = (successRate * 0.5) + (agePenalty * 0.2) + (domStability * 0.3)
```

---

## 5.4 Component scoping (boundary detection)

Scoping prevents a locator from accidentally matching the wrong repeated UI element.

Implemented in:

- `framework/locator-intelligence/component-boundary-detector.js`

In practice, scoping is applied when the caller chooses to:

- discover a boundary for a successful locator
- re-resolve inside that boundary

---

## 5.5 AI healing fallback

This repository currently implements **registry-alternatives healing**.

- `framework/locator-intelligence/healing-engine.js`

The file explicitly states that **legacy 3-stage healing (component registry + fuzzy + LLM rewrite) has been removed**.

So, if you need “AI healing” (LLM-based selector rewrite), it would need to be reintroduced via a dedicated module (the platform does have `platform/core/ai-engine.js`, but the LIE healing path shown here is registry-based).

---

## 5.6 Full locator lifecycle (runtime)

```text
Test wants "quick_order_button"
  ↓
Caller creates original locator (or a registry selector is resolved)
  ↓
LIE enabled? (ENABLE_LIE=true)
  ├─ No → execute original locator only
  └─ Yes
      ↓
      Proactive wait (overlay/hydration)
      ↓
      Candidate list (SQLite memory + seeded alternatives)
      ↓
      Rank candidates (success/confidence/entropy)
      ↓
      Try candidate #1
        ├─ success → learn + telemetry → done
        └─ fail → classify failure
              ↓
              corrective wait (overlay/mutation/hydration)
              ↓
              try next candidate
```