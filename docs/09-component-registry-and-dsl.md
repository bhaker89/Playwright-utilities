# SECTION 9 — Component Registry (Planned / Optional If Present)

## Locator registry vs component registry

### Locator Registry (implemented)

- **What:** low-level mapping of `logical_key → selector metadata`
- **Where:** `locator-registry/services/**` (YAML)
- **Used by:** platform intent runner and grounding

Example key:

- `quick_order_button`

### Component Registry (partial implementation)

- **What:** semantic mapping of UI concepts to locators, potentially grouped by page/component
- **Where (current):** `platform/core/component-registry.js`
- **Storage:** `.auth/ui-registry.json`

Current API:

- `register(pageName, componentName, locatorMetadata)`
- `get(pageName, componentName)`

This is a starting point, not yet a full “component registry” with stable contract keys.


## Why component registry matters for manual QA

Manual QA generally thinks in **features and UI components**, not CSS/XPath.

A component registry enables:

- plain-English test authoring
- reusable semantic actions
- consistent naming across teams


## DSL-ready architecture (as implemented today)

There are two “DSL-like” layers in this repo:

1. **No-code YAML tests**: `no-code-tests/**`
2. **Intent specs**: `specs/intent/*.intent.yaml`

Execution engines:

- `platform/engines/ui-engine.js` — executes actions like `click`, `fill`, `wait`
- `platform/core/intent-runner.js` — orchestrates spec execution


## What “good” component keys could look like

Examples (requested):

- `product-card.add-to-cart`
- `order-table.row.edit`

How you would implement this direction:

1. Define a component key schema (e.g. `<component>.<element>`)
2. Store component definitions per service + feature
3. Resolve component keys to locators via:
   - component registry → locator registry (or direct Playwright locators)
4. Provide a DSL syntax that compiles to UIEngine steps


## Practical next step

If you want this repo to truly support manual QA authoring, the recommended next milestone is:

- add `components/registry/` YAML or JSON (versioned)
- update `platform/core/component-registry.js` to load those definitions
- add a resolver that maps `component-key` to a concrete selector