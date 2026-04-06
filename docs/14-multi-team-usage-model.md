# SECTION 14 — Multi-Team Usage Model

This framework is intended to be used across multiple teams without becoming brittle.

---

## Platform/framework team responsibilities

Own and evolve:

- engines under `framework/locator-intelligence/`
- platform runners and generators in `platform/`
- cross-cutting fixtures in `fixtures/base-test.js`
- global standards:
  - naming conventions for locator keys
  - registry schemas
  - telemetry retention/exports


## Feature team responsibilities

Own:

- service-specific locators
  - `locator-registry/services/<service>/**`
- test suites for features
  - `tests/ui/<feature>*.spec.js`
  - `specs/intent/<feature>.intent.yaml`

Contribute:

- stable semantic locators (`data-testid`, roles)
- fallbacks where needed


## Manual QA responsibilities (future-ready)

As the DSL layer becomes more mature, manual QA can:

- author intent prompts/specs
- validate intent specs with `validate-intent-prompt`
- run flows in headed mode

The goal is that manual QA does not need to know CSS/XPath.


## How the framework stays centrally upgradeable

Key design choices:

- LIE is centralized in `framework/locator-intelligence/*`
- execution entrypoints are centralized in `fixtures/base-test.js` and `platform/core/*`
- registries isolate team changes from platform upgrades

This reduces the blast radius of engine changes and helps with long-term maintainability.