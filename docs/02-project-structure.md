# SECTION 2 — Project Structure Walkthrough

This section explains the repository **folder-by-folder** and how modules connect.

> Note: The names in your request (e.g. `registry/`, `telemetry/`, `dsl/`, `cli/`) are implemented here as **concrete directories** such as `locator-registry/`, `framework/locator-intelligence/`, `platform/cli/`, etc.

---

## `framework/`

**Purpose:** Core automation engines that are independent of any specific test suite.

### `framework/locator-intelligence/`

**Responsibility:** The Locator Intelligence Engine (LIE).

Key files:

- `locator-orchestrator.js` — central brain: candidate selection, retries, waits, telemetry
- `locator-memory-store.js` — SQLite-backed learning store (`locator-memory.db`)
- `locator-ranker.js` — ranks candidates using success + confidence + entropy penalties
- `selector-stability-evaluator.js` — entropy/fragility scoring for css/xpath
- `failure-classifier.js` — maps errors to semantic failure types
- `wait-strategy-engine.js` + `adaptive-wait-context.js` — targeted adaptive waits
- `healing-engine.js` — registry-based rescue path
- `locator-telemetry-engine.js` — collects and flushes execution telemetry
- `locator-map-registry.js` + `locator-map.json` — ownership + alternatives registry
- `locator-factory.js` — middleware adapter (used by platform bridge)
- `environment-context-engine.js` — env-aware scoring knobs (thin layer)
- `locator-version-manager.js` — versioning scaffolding (thin layer)
- `component-boundary-detector.js` — boundary discovery/scoping
- `execution-context-detector.js`, `dom-volatility-detector.js` — DOM/framework detection

**How it connects:**

- UI execution routes through LIE via `platform/core/smart-locator.js` and `framework/locator-intelligence/locator-factory.js`.

---

## `tests/`

**Purpose:** Code-first test suites executed directly by Playwright.

Common areas:

- `tests/smoke/` — smoke suites
- `tests/api/` — API tests
- `tests/setup/` — setup projects (auth storage state)
- `tests/ui/` — UI suites
- `tests/generated/` — generated tests (from platform generators)

**How it connects:**

- Most tests import the unified fixtures from `fixtures/base-test.js`.

---

## `fixtures/`

### `fixtures/base-test.js`

**Purpose:** The single entry point for fixtures.

Provides:

- `page` (Playwright)
- `apiClient` (wrapper around Playwright `request`)
- `sharedContext` (cross-step data)
- `ui` (YAML UI engine)
- `bridge` (page objects + helpers)

**How it connects:**

- Tests import `const { test, expect } = require('../fixtures/base-test')`.

---

## `locator-registry/`

**Purpose:** The **service-scoped locator registry**, stored as YAML.

Example:

- `locator-registry/services/1mg-web/quick_order.yaml`

**How it connects:**

- Platform runners load these files via `platform/core/locator-registry-loader.js` and convert them to Playwright selectors via `platform/core/locator-registry-resolver.js`.

---

## `platform/`

**Purpose:** “Platform mode” execution (intent pipeline, grounding, spec runners, generators).

### `platform/cli/`

**Responsibility:** CLI entrypoints.

- `platform/cli/index.js` — main CLI router
- `platform/cli/openapi-test-orchestrator.js` — houses intent pipeline commands (validate/generate/ground/run)

### `platform/core/`

**Responsibility:** Core orchestration, registries, and spec runners.

Common files:

- `intent-runner.js` — runs intent specs end-to-end
- `ground-spec.js` — grounding: maps spec targets to registry entries
- `locator-registry-loader.js` — reads YAML registry
- `locator-registry-resolver.js` — converts registry entry to executable selector
- `locator-registry-writer.js` — writes grounded registry updates
- `smart-locator.js` — legacy bridge into LIE (`LocatorFactory`)

### `platform/engines/`

**Responsibility:** Runtime engines.

- `ui-engine.js` — executes UI steps (click/fill/wait/assert)
- `assertion-engine.js` — assertion evaluation for intent runs
- `api-executor.js` — API execution

### `platform/generators/`

**Responsibility:** Convert prompts/specs/openapi/curl into executable tests.

---

## `pages/`

**Purpose:** Page Objects.

- `pages/base.page.js` and other `*.page.js` files.

**How it connects:**

- The `bridge` fixture (see `utils/ui/bridge.js`) provides a single access point to page objects.

---

## `utils/`

**Purpose:** Cross-cutting helpers used by tests and engines.

Notable:

- `utils/base/logger.js` — shared logger used across modules
- `utils/api/*` — auth helpers, API client wrappers
- `utils/ui/*` — UI action wrappers and bridge patterns
- `utils/network/*` — network controls
- `utils/reporting/*` — reporting utilities

---

## `config/`

**Purpose:** Environment + services configuration.

- `.env.*` — env-specific overrides
- `services.yaml` — service definitions consumed by platform runners
- `environment.config.js` — env resolution helpers

---

## “dsl/”, “telemetry/”, “registry/” mapping

This repo’s implementation maps those conceptual areas as:

- **DSL** → `no-code-tests/` YAML + `platform/engines/ui-engine.js`
- **Telemetry** → `framework/locator-intelligence/locator-telemetry-engine.js` + SQLite store `locator-memory.db`
- **Registry** → `locator-registry/` (YAML) + `framework/locator-intelligence/locator-map.json` (ownership/alternatives)


## “api/”, “reporters/” mapping

- API support is implemented via `utils/api/*`, `services/*`, `platform/engines/api-executor.js`, and Playwright `request` fixture.
- Report outputs live under `playwright-report/`, `allure-results/`, `reports/`, and `test-results/`.