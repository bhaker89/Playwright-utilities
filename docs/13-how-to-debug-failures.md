# SECTION 13 — How to Debug Failures

This framework gives you three levels of debugging signal:

1. **Playwright traces / screenshots** (`test-results/`, HTML report)
2. **Framework logs** (`utils/base/logger.js` output, often also under `logs/`)
3. **LIE telemetry + SQLite learning store** (`framework/locator-intelligence/locator-memory.db`)

---

## 13.1 Start with Playwright artifacts

- `npx playwright show-report` (HTML report)
- look at `test-results/**/error-context.md` (if present)
- check screenshots and trace attachments

---

## 13.2 Read failure classifier output

The orchestrator logs failures like:

```text
[Orchestrator] Candidate css (...) failed: OVERLAY_BLOCKED
```

Classification rules live in:

- `framework/locator-intelligence/failure-classifier.js`

This tells you whether you’re dealing with:

- a locator quality issue (entropy/selector)
- a runtime stability issue (overlay/hydration)

---

## 13.3 Interpret fallback depth

When multiple candidates exist, the orchestrator tries them in ranked order.

If a test succeeds only after multiple failures, it indicates:

- primary locator is stale, or
- registry needs an updated primary, or
- environment-specific DOM variance

Action:

- update primary locator in `locator-registry/services/...`
- add/adjust alternatives in `locator-map.json`

---

## 13.4 Interpret confidence score (where applicable)

Confidence is computed by:

- `framework/locator-intelligence/confidence-engine.js`

Inputs:

- success rate
- last used timestamp
- dom stability

If a locator is frequently failing, it will naturally trend toward `WARN/REPLACE` recommendations.

---

## 13.5 Telemetry + SQLite inspection

The store path:

- `framework/locator-intelligence/locator-memory.db`

Tables:

- `locators` (aggregate)
- `locator_history` (event log)

Practical approach:

- identify locator key causing flakiness
- inspect its strategies and success rate
- update registry to promote the best strategy as primary

---

## 13.6 Debugging platform intent runs

For platform runs (intent specs), validate:

- spec targets exist in the registry
- registry resolver produced the expected selector

Key files:

- `platform/core/intent-runner.js`
- `platform/core/locator-registry-loader.js`
- `platform/core/locator-registry-resolver.js`

---

## 13.7 Common patterns and fixes

- `OVERLAY_BLOCKED` → add/strengthen overlay wait or close popups at navigation
- `REACT_REPLACEMENT` / `LAZY_RENDER_PENDING` → add a wait step or ensure `networkidle` is reached
- `DETACHED_NODE` → switch to a more stable locator (role/testid) and avoid selecting elements in rapidly re-rendering lists