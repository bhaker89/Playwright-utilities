# SECTION 4 — Locator Intelligence Engine (Very Detailed)

This section is the deep dive into **each module** in `framework/locator-intelligence/` and how it integrates into execution.

> Conventions used below:
> - **Inputs**: parameters + required runtime state
> - **Outputs**: return values + side effects (telemetry/DB)
> - **Invocation**: how code reaches this module

---

## 4.1 `locator-orchestrator.js`

**Purpose**

The “brain” of LIE. It executes a logical locator action via a pipeline:

- proactive waits
- candidate resolution
- ranked execution loop
- failure classification
- targeted corrective waits
- telemetry and learning

**Key entrypoint**

- `async smartLocator(locatorKey, actionFn, originalLocator = null)`

**Inputs**

- `locatorKey` — logical name (e.g. `AddToCartButton`, `quick_order_button`)
- `actionFn(locator)` — the Playwright operation to run (`click`, `fill`, etc.)
- `originalLocator` — optional base locator passed by caller

**Outputs**

- returns `actionFn` result
- updates SQLite (`locator-memory-store.updateStats`) on success
- emits telemetry (`locator-telemetry-engine.collect`)

**Integration**

- Called by `framework/locator-intelligence/locator-factory.js`
- Routed by `platform/core/smart-locator.js` when `ENABLE_LIE=true`

**Example invocation**

```js
// platform/core/smart-locator.js
return await this.factory.create(elementName, actionFn, originalLocator);
```

**Example runtime scenario**

- click fails due to overlay
- `failure-classifier` returns `OVERLAY_BLOCKED`
- orchestrator calls `wait-strategy-engine.apply('OVERLAY_BLOCKED')`
- retries next candidate or same flow continues

---

## 4.2 `locator-memory-store.js`

**Purpose**

SQLite-backed store that learns which locator strategies work best.

**Inputs**

- `locatorKey`, `strategy`, `success`, `executionTime`, `domSignature`

**Outputs**

- persistent DB updates in `framework/locator-intelligence/locator-memory.db`
- writes WAL/shm files for concurrency

**Integration**

- called from orchestrator on success/failure
- also used by telemetry flush (`locator-telemetry-engine.js`)

**Example runtime scenario**

- `getByTestId` succeeds quickly repeatedly → high success_rate + low avg_exec_time
- ranker starts preferring it over fragile CSS

---

## 4.3 `locator-ranker.js`

**Purpose**

Ranks candidates using a scoring formula combining:

- success rate (learned)
- confidence metadata
- visibility context
- entropy penalty (selector fragility)

**Key functions**

- `rank(candidates, context)`
- `calculateScore(candidate, context)`

**Inputs**

- candidates from memory store / seeds
- context like visibility

**Outputs**

- sorted list with `totalScore`

**Example runtime scenario**

- CSS with `nth-child` gets high entropy → score drops → tried later

---

## 4.4 `selector-stability-evaluator.js`

**Purpose**

Computes a simple **entropy/fragility score** from selector strings.

**Inputs**

- selector string

**Outputs**

- number `0..1` where `1` is most fragile

**Integration**

- used by `locator-ranker.js`
- also imported in grounding pipeline (`platform/core/ground-spec.js`, `platform/core/locator-registry-resolver.js`)

---

## 4.5 `failure-classifier.js`

**Purpose**

Converts raw Playwright errors into semantic types.

**Supported types (current implementation)**

- `NOT_VISIBLE`
- `DETACHED_NODE`
- `OVERLAY_BLOCKED`
- `REACT_REPLACEMENT`
- `SHADOW_ROOT_MISSING`
- `SCROLL_REQUIRED`
- `LAZY_RENDER_PENDING`
- `FRAME_CONTEXT_LOST`
- `TRANSITION_ACTIVE`
- `UNKNOWN_FAILURE`

**Integration**

- used inside orchestrator candidate loop

---

## 4.6 `adaptive-wait-context.js`

**Purpose**

Detects runtime page context (React/Next/shadow/overlay/loading) to inform waits.

**Entrypoint**

- `AdaptiveWaitContext.detect(page)`

**Outputs**

- `{ hasReact, hasNextJS, hasShadowRoot, hasOverlay, isHydrating, isLoading }`

---

## 4.7 `wait-strategy-engine.js`

**Purpose**

Applies targeted waits based on failure type + detected context.

**Entrypoint**

- `waitEngine.apply(failureType)`

**Strategies implemented**

- proactive overlay/hydration checks
- `waitForLoadState('networkidle')` for React/lazy render
- MutationObserver stability wait
- overlay dismissal wait (hidden/detached)
- shadow root attach detection

---

## 4.8 `healing-engine.js`

**Purpose**

Rescue path using registry-based alternatives.

**Entrypoint**

- `attemptRescue(locatorKey, originalLocator)`

**Inputs**

- locatorKey
- original locator

**Outputs**

- `{ locator, strategy }` or `null`

**Integration**

- orchestrator instantiates HealingEngine, but actual rescue is primarily via `locator-map-registry.js` alternatives.

> Important: This file states the legacy 3-stage healing (component registry, fuzzy, AI rewrite) has been removed.

---

## 4.9 `confidence-engine.js`

**Purpose**

Computes a confidence score from stats + context and recommends actions:

- `KEEP`, `MONITOR`, `WARN`, `REPLACE`

**Entrypoint**

- `calculate(stats, context)`

**Integration**

- used by upgrade suggester

---

## 4.10 `locator-upgrade-suggester.js`

**Purpose**

Autonomous improvement hook: generates a `.patch` file suggesting upgrades.

**Output path**

- `framework/locator-intelligence/locator-upgrades.patch`

**Status**

- currently a scaffold with a hard-coded example suggestion

---

## 4.11 `locator-version-manager.js`

**Purpose**

Scaffold for versioned locators per environment (rollback/branch testing).

**Status**

- currently in-memory only

---

## 4.12 `locator-map-registry.js` (+ `locator-map.json`)

**Purpose**

Team/ownership registry and alternative locators for healing.

**Entrypoint**

- `getAlternatives(locatorKey)`

**Heuristics**

If `locator-map.json` stores a simple string array, the registry infers:

- XPath if string starts with `//` or `(`
- CSS if string contains `. # [ ] > + ~`
- otherwise assumes `getByTestId`

---

## 4.13 `component-boundary-detector.js`

**Purpose**

Discovers a stable parent boundary (form/main/card/modal/etc) for scoping.

**Key methods**

- `discoverBoundary(locator)`
- `getScopedLocator(baseLocator, boundary)`

**Status**

- implemented and available; adoption depends on callers using it

---

## 4.14 `environment-context-engine.js`

**Purpose**

Provides env-specific knobs (domStability/latencyThreshold).

**Status**

- thin mapping today; designed for richer env-specific learning later

---

## 4.15 `execution-context-detector.js`

**Purpose**

Captures execution-layer metadata:

- frame count
- shadow root count
- React detected
- URL + title

Used for telemetry/context.

---

## 4.16 `dom-volatility-detector.js`

**Purpose**

Detects volatility sources:

- hydration state
- mutation bursts
- active animations
- presence of shadow DOM

Designed to drive smarter waiting decisions.

---

## 4.17 `locator-factory.js`

**Purpose**

Decouples callers from orchestrator details; exposes a single `create()`.

**Entrypoint**

- `create(locatorKey, actionFn, originalLocator)`

**Integration**

- used by `platform/core/smart-locator.js`

---

## Modules mentioned in the request but not present as files

Your requested list included a few names that do **not exist as separate files** in this repository:

- `locator-upgrade-suggester.js` ✅ exists
- `locator-version-manager.js` ✅ exists
- `locator-map-registry.js` ✅ exists
- `component-boundary-detector.js` ✅ exists
- `wait-strategy-engine.js` ✅ exists
- `adaptive-wait-context.js` ✅ exists

If you want additional modules like `entropy-aware locator ranking` expanded further, those behaviors are implemented across:

- `selector-stability-evaluator.js`
- `locator-ranker.js`
- grounding helpers in `platform/core/ground-spec.js`