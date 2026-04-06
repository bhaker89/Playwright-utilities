# SECTION 6 — Telemetry System

## What telemetry captures

Telemetry is collected for each locator execution attempt.

Collected (from `framework/locator-intelligence/locator-orchestrator.js` and `locator-telemetry-engine.js`):

- `locatorKey`
- `strategy` (candidate strategy name)
- `status` (`SUCCESS` / `FAILURE`)
- `duration`
- `failureType` (when failure happens)
- `context` (from `execution-context-detector.js`)
- timestamp


## Why telemetry matters

At scale, “fix flaky tests” becomes a data problem:

- Which locators fail most?
- Which strategies succeed most?
- Do failures correlate with overlays/hydration/animations?

Telemetry makes stability measurable and enables:

- ranking improvements (prefer historically stable candidates)
- proactive upgrade suggestions
- environment-specific tuning


## How telemetry improves locator ranking

The learning loop is:

1. Orchestrator executes candidates
2. On each attempt, telemetry is collected
3. Telemetry flush updates the SQLite store
4. Next run ranks by success_rate and penalizes fragile selectors

Implementation:

- collector: `framework/locator-intelligence/locator-telemetry-engine.js`
- persistence: `framework/locator-intelligence/locator-memory-store.js`
- scoring: `framework/locator-intelligence/locator-ranker.js`


## Runtime artifacts

### SQLite telemetry database (used)

- `framework/locator-intelligence/locator-memory.db`
- plus `locator-memory.db-wal`, `locator-memory.db-shm`

Tables created (see `locator-memory-store.js`):

- `locators` — per `(locator_key, strategy)` stats
- `locator_history` — append-only per execution

### JSON telemetry outputs

This repo does not currently generate files named `runtime-memory.json` or `locator-history.json` by default.

The authoritative store is SQLite.

If you want JSON exports for dashboards, add an explicit export job (recommended pattern: a CLI command that reads SQLite and writes JSON summaries into `reports/`).


## How telemetry enables autonomous evolution

Two “hooks” already exist:

1. **Confidence engine** (`confidence-engine.js`)
   - converts stats into actions: KEEP / MONITOR / WARN / REPLACE

2. **Upgrade suggester** (`locator-upgrade-suggester.js`)
   - generates `framework/locator-intelligence/locator-upgrades.patch`

Today the upgrade suggester is a scaffold; the architecture supports a full autonomous loop:

```text
telemetry → confidence → suggestion → PR/patch → review → registry update
```