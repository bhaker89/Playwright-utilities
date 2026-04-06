# SECTION 11 — How to Add a New Locator

There are two primary “locator systems” in this repository:

1. **Service Locator Registry (YAML)** — used by platform intent runner
2. **Locator Map Registry (JSON)** — used by LIE healing as alternatives

---

## 11.1 Add a locator to the service registry (recommended for platform specs)

**Where it lives**

- `locator-registry/services/<service>/<feature>.yaml`

Example:

- `locator-registry/services/1mg-web/quick_order.yaml`

**Structure**

```yaml
my_new_button:
  primary:
    type: css
    value: button[data-testid="my-new-button"]
  fallback:
    - type: role
      value:
        role: button
        options:
          name: My new button
          exact: false
```

**How the registry works**

- loader: `platform/core/locator-registry-loader.js`
- resolver: `platform/core/locator-registry-resolver.js`

The resolver turns types like `css`, `text`, `role`, `label`, `testid` into executable selectors.

---

## 11.2 How locator ranking affects which locator is tried first

Ranking (LIE) uses:

- learned success rate (SQLite)
- confidence metadata
- entropy penalties for fragile selectors

Files:

- `framework/locator-intelligence/locator-memory-store.js`
- `framework/locator-intelligence/locator-ranker.js`
- `framework/locator-intelligence/selector-stability-evaluator.js`

---

## 11.3 Add a healing alternative to the locator map registry

**Where it lives**

- `framework/locator-intelligence/locator-map.json`

**How it’s read**

- `framework/locator-intelligence/locator-map-registry.js`

**Example entry**

```json
{
  "AddToCartButton": [
    "add-to-cart", 
    "button[data-testid=\"add-to-cart\"]",
    "//button[contains(., 'Add to cart')]"
  ]
}
```

Heuristics convert strings into strategies:

- XPath if starts with `//` or `(`
- CSS if looks like CSS
- otherwise treated as `getByTestId`

---

## 11.4 Best practices

- Prefer `data-testid` and accessible roles over CSS chains
- Keep fallbacks limited (2–5) to avoid slow candidate explosion
- Avoid positional CSS (`nth-child`) unless there is no alternative
- Use service-scoped YAML for platform specs; use map registry for global healing/ownership