# SECTION 3 — Execution Flow (End-to-End Pipeline)

This section explains the runtime lifecycle from **test definition** to **Playwright execution**, including where LIE participates.

---

## Two execution modes

### Mode A — Code-first Playwright tests

Entry point:

- `npx playwright test ...`

Typical files:

- `tests/**/*.spec.js`
- fixtures: `fixtures/base-test.js`

### Mode B — Platform pipeline (intent/spec driven)

Entry point:

- `node platform/cli/openapi-test-orchestrator.js ...`

Typical files:

- prompt: `specs/intent-prompts/*.txt`
- spec: `specs/intent/*.intent.yaml`
- registry: `locator-registry/services/**`

---

## End-to-end lifecycle (visual)

### Code-first UI test lifecycle

```text
CLI
  ↓
playwright.config.js (projects + env + global setup)
  ↓
fixtures/base-test.js (inject page/apiClient/bridge/ui/sharedContext)
  ↓
Test code (tests/**/*.spec.js)
  ↓
Page Objects (pages/*.page.js) + utils/*
  ↓
SmartLocator bridge (platform/core/smart-locator.js)
  ↓
LocatorFactory (framework/locator-intelligence/locator-factory.js)
  ↓
LocatorOrchestrator (framework/locator-intelligence/locator-orchestrator.js)
  ↓
Playwright actions (click/fill/wait/etc)
  ↓
Telemetry + SQLite memory store updates
  ↓
Reporters (playwright-report/, test-results/, allure-results/)
```

### Platform intent pipeline lifecycle

```text
Prompt (.txt)
  ↓ validate / parse
Intent Spec (.intent.yaml)
  ↓ ground-spec
Locator Registry (locator-registry/services/<service>/<feature>.yaml)
  ↓ run-intent
UIEngine + AssertionEngine
  ↓ (optional) generate-intent-test
Generated Playwright spec (tests/ui/generated/*.spec.js)
```

---

## Where each requested module fits (as implemented here)

### DSL step (if present)

In this repo, “DSL-ready” is represented by YAML step runners:

- `no-code-tests/ui/*.yaml`
- `platform/engines/ui-engine.js` executes steps

### Flow registry

Flow concepts are represented by:

- intent specs: `specs/intent/*.intent.yaml`
- no-code suites: `no-code-tests/**/*.yaml`

### Component registry (planned / partial)

A lightweight registry exists:

- `platform/core/component-registry.js` (stores `.auth/ui-registry.json`)

It is currently a dynamic store for discovered locators; the repo does not yet fully implement a semantic “component registry” API with stable keys like `product-card.add-to-cart`.

### Locator registry

- YAML registry: `locator-registry/services/**`
- loader/resolver/writer: `platform/core/locator-registry-*.js`

### Locator orchestrator

- `framework/locator-intelligence/locator-orchestrator.js`

Responsibilities:

- proactive waiting
- ranked candidate execution loop
- failure classification
- targeted corrective waits
- telemetry collection
- learning (SQLite updates)

### Locator ranking + entropy-aware selection

- `framework/locator-intelligence/locator-ranker.js`
- `framework/locator-intelligence/selector-stability-evaluator.js`

### Wait strategy engine

- `framework/locator-intelligence/wait-strategy-engine.js`
- `framework/locator-intelligence/adaptive-wait-context.js`

### Failure classifier

- `framework/locator-intelligence/failure-classifier.js`

### Healing engine

- `framework/locator-intelligence/healing-engine.js`

> Note: This implementation explicitly says legacy multi-stage healing was removed and now focuses on registry alternatives.

### Confidence engine

- `framework/locator-intelligence/confidence-engine.js`

Used primarily for scoring/recommendations and autonomous upgrades (see upgrade suggester).

### Telemetry engine

- `framework/locator-intelligence/locator-telemetry-engine.js`

### Environment context engine

- `framework/locator-intelligence/environment-context-engine.js`

Currently a thin env-to-params mapping; it can be extended to influence ranking/wait thresholds.

### Version manager

- `framework/locator-intelligence/locator-version-manager.js`

Currently scaffolding (in-memory). Designed for future registry versioning/rollback patterns.

---

## Example: What happens on a click (with LIE enabled)

1. Test calls click via UIEngine or a Page Object
2. SmartLocator routes the click through `LocatorFactory.create()`
3. Orchestrator does:
   - proactive wait (`WaitStrategyEngine.apply('PROACTIVE')`)
   - loads candidates (SQLite memory + map registry seeds)
   - ranks candidates (success rate + entropy penalties)
   - tries candidates until one succeeds
   - on failure: classify → corrective wait → try next
4. Telemetry is collected and flushed to SQLite

This is the core mechanism that makes test behavior resilient.