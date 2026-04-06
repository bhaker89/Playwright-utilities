# SECTION 17 — Future Roadmap Support

This repo already contains the “skeleton” for several next-level automation capabilities.

---

## Component registry

Status today:

- `platform/core/component-registry.js` exists and persists `.auth/ui-registry.json`

To reach full component registry:

- add versioned component definitions per service
- define semantic component keys (e.g. `product-card.add-to-cart`)
- add resolvers that compile semantic keys → executable locators

---

## Plain-English DSL automation

Status today:

- YAML runners exist (`platform/engines/ui-engine.js`)
- intent specs exist (`specs/intent/*.intent.yaml`)

Next steps:

- add a constrained DSL schema (to limit ambiguity)
- compile DSL into UIEngine steps
- integrate component registry to avoid exposing selectors

---

## AI locator healing

Status today:

- LIE healing uses registry alternatives (`healing-engine.js`)
- platform includes `platform/core/ai-engine.js` for LLM interactions

To introduce AI healing safely:

- only trigger LLM after deterministic healing fails
- store suggested locators as “candidates” with low initial confidence
- require human review to promote to primary registry

---

## Autonomous framework evolution

Already scaffolded:

- telemetry + SQLite learning
- confidence engine (KEEP/MONITOR/WARN/REPLACE)
- upgrade suggester writes a `.patch`

To productionize:

- implement a real suggestion generator that queries all locators
- export weekly “locator health” dashboards
- wire into PR workflows with optional auto-generated patches