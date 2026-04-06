# SECTION 1 — Framework Overview

## What this framework is

This repository is an **enterprise-grade automation framework** built on **Playwright + Node.js** that supports:

- **UI automation** (DWeb + MWeb through Playwright projects/devices)
- **API automation** (Playwright `request` context wrapped as a first-class fixture)
- **Hybrid automation** (create/seed via API, verify via UI in the same test)
- **No-code / DSL-style execution** (YAML-driven runners in `platform/` and `no-code-tests/`)

The defining capability of this framework is the **Locator Intelligence Engine (LIE)**, which improves stability using:

- ranked locator candidates (memory + heuristics)
- adaptive wait strategies
- failure classification
- healing fallback (registry alternatives)
- telemetry + learning (SQLite-backed memory store)


## Why it exists

Basic Playwright projects usually start simple and then hit the same scaling wall:

- selectors break when UI changes
- tests become flaky due to hydration/overlays/transitions
- teams duplicate utilities and patterns
- “ownership” of locators becomes unclear across features/microfrontends

This framework exists to **centralize automation primitives** and **reduce long-term maintenance**.


## Problems it solves

### 1) Flaky UI tests
The framework adds engines around Playwright that detect common sources of flakiness:

- overlays intercepting clicks
- React/Next hydration not completed
- detached nodes due to re-render
- transitions/animations
- lazy rendering timeouts

These are classified (see `framework/locator-intelligence/failure-classifier.js`) and handled via targeted waits (see `framework/locator-intelligence/wait-strategy-engine.js`).

### 2) Locator brittleness and maintenance overhead
Instead of a single hard-coded selector, LIE can:

- try **multiple strategies** for a logical locator key
- remember what worked best (success rate, speed)
- penalize fragile selectors (entropy scoring)

This is implemented in:

- `framework/locator-intelligence/locator-orchestrator.js`
- `framework/locator-intelligence/locator-memory-store.js` (SQLite)
- `framework/locator-intelligence/locator-ranker.js`
- `framework/locator-intelligence/selector-stability-evaluator.js`

### 3) Multi-team scaling
This repo supports a model where:

- a platform/framework team maintains the engines
- feature teams contribute locators + flows
- manual QA can later author tests in a DSL (planned direction)

A key enabler is centralized registries:

- **locator registry** (service-scoped YAML): `locator-registry/services/**`
- **locator map registry** (ownership + alternatives): `framework/locator-intelligence/locator-map.json` read via `locator-map-registry.js`


## How this differs from a basic Playwright setup

A minimal Playwright repo typically has:

- tests
- page objects
- a config

This framework additionally adds:

1. **Unified fixtures layer** (`fixtures/base-test.js`)
   - one base test supports UI/API/Hybrid
2. **Locator Intelligence Engine** (`framework/locator-intelligence/*`)
   - ranking, telemetry, healing, adaptive waits
3. **Platform runners and CLI** (`platform/*`)
   - intent pipeline, grounding, spec-based execution, test generation


## How locator intelligence improves stability (high-level)

A standard Playwright click:

```text
page.locator(selector).click()
```

With LIE enabled (`ENABLE_LIE=true`), the action becomes:

```text
logicalKey → ranked candidates → execute → learn → (if fail) classify → wait/heal → retry
```

LIE is designed so a test can remain stable even when:

- the “primary” selector changes
- an overlay blocks the UI temporarily
- React re-renders detach the node


## Multi-team usage readiness

The framework is intentionally structured so each team can:

- add/maintain service-scoped locators without touching core engines
- run the same test suites across environments via `config/.env.*` and `config/services.yaml`
- contribute generated tests/specs via standardized folders (`tests/`, `specs/`, `locator-registry/`)


## Manual QA usage (planned direction)

Manual QA friendliness is achieved by gradually shifting from “code-first selectors” to “intent-first steps”:

- write intent prompts/specs (`specs/intent-prompts`, `specs/intent/*.intent.yaml`)
- ground to registry (`locator-registry/services/**`)
- execute via runners (`platform/core/intent-runner.js`)

This is the foundation for a plain-English DSL in the future (see [09-component-registry-and-dsl.md](./09-component-registry-and-dsl.md)).