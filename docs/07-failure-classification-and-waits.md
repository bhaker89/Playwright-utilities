# SECTION 7 — Failure Classification System

The framework classifies failures to avoid “retry blindly” and instead apply a targeted recovery.

Implementation:

- classifier: `framework/locator-intelligence/failure-classifier.js`
- waits: `framework/locator-intelligence/wait-strategy-engine.js`

> Note: Some failure types in your request exist conceptually, but this repository’s classifier currently supports a subset.

---

## Supported failure types (current code)

### `NOT_VISIBLE`
**Detected when:** error contains `not visible` / `is hidden`

**Response:** wait for DOM mutation stability (best effort)

- `wait-strategy-engine.waitForMutationStability()`

---

### `DETACHED_NODE`
**Detected when:** `detached`, `stale element`, `no longer in the dom`

**Response:** wait for mutation stability then retry candidates

---

### `OVERLAY_BLOCKED`
**Detected when:** `covered by`, `overlay`, `intercepting`, `pointer-events`

**Response:** wait for overlay dismissal

- `waitForOverlayDismiss()` waits for `hidden` or `detached`

---

### `REACT_REPLACEMENT`
**Detected when:** `hydration`, `react replacement`, `react fiber`

**Response:** `waitForLoadState('networkidle')` + hydration wait

---

### `SHADOW_ROOT_MISSING`
**Detected when:** `shadow root`

**Response:** wait for shadow root attach

---

### `FRAME_CONTEXT_LOST`
**Detected when:** `context closed`, `frame was detached`, `execution context was destroyed`

**Response:** No strong recovery exists automatically (usually requires navigation/context recreation). The classifier makes it visible so failures are not misdiagnosed as locator issues.

---

### `LAZY_RENDER_PENDING`
**Detected when:** timeouts / waiting for locator

**Response:** `waitForLoadState('networkidle')` (best effort)

---

### `TRANSITION_ACTIVE`
**Detected when:** `animation`, `transition`

**Response:** short animation wait (currently a small delay)

---

## Failure types requested but not implemented as explicit codes

Your list included:

- `HYDRATION_PENDING`
- `REACT_REPLACEMENT` ✅ (closest)
- `LAZY_RENDER_PENDING` ✅

If you want `HYDRATION_PENDING` as a distinct code, add a pattern in `failure-classifier.js` and a dedicated branch in `wait-strategy-engine.js`.

---

# SECTION 8 — Wait Strategy Engine

## Why adaptive waits reduce flakiness

Hard-coded sleeps make tests:

- slow in the happy path
- still flaky in the slow path

Adaptive waits react to real page conditions:

- overlays present
- hydration not complete
- mutation bursts
- animations running

---

## What is implemented now

### Overlay detection

- selectors: `[role="dialog"]`, `[aria-modal="true"]`, `.modal-backdrop`, `.overlay`, etc.

### Network idle detection

- `page.waitForLoadState('networkidle')` in React/lazy render cases

### Mutation observer detection

- MutationObserver-based “quiet period” wait

### Shadow root attach detection

- `page.waitForFunction()` to detect any shadowRoot

---

## Planned enhancements (architecture-ready)

You requested:

- hydration detection
- mutation observer detection
- component mount detection

The current architecture is ready for these improvements:

- `AdaptiveWaitContext` already detects React/Next and overlays
- `DOMVolatilityDetector` measures animations/mutations

To extend:

- enrich `AdaptiveWaitContext.detect()` to add hydration-specific signals
- add more strategies in `WaitStrategyEngine.apply()`