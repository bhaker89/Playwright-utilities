# Locator Intelligence Engine (LIE) Architecture

The Locator Intelligence Engine (LIE) is a modular, autonomous operating system for UI locators in Playwright. It replaces static selectors with a dynamic, self-healing, and self-optimizing pipeline.

## 1. Core Orchestration Layer

### [locator-orchestrator.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/locator-orchestrator.js)
**What:** The central coordinator of the LIE pipeline.
**Why:** It decouples the test logic from the complexity of healing. It receives a request and manages the flow through ranking, execution, wait-strategies, and healing.

### [locator-factory.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/locator-factory.js)
**What:** A middleware factory for creating smart locators.
**Why:** Ensures easy integration into `BasePage` without tight coupling. It allows the framework to switch between standard Playwright locators and LIE-powered locators seamlessly.

---

## 2. Intelligence & Decisions

### [locator-ranker.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/locator-ranker.js)
**What:** A context-aware scoring engine.
**Why:** Uses a multi-factor formula (Success Rate, Semantic Strength, DOM Stability, Entropy Penalty) to choose the best locator for the current environment. This eliminates static fallback orders.

### [confidence-engine.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/confidence-engine.js)
**What:** Calculates a confidence score for each locator.
**Why:** Used to trigger automated refactoring suggestions. If a locator's confidence drops below 0.40, it is flagged for replacement.

---

## 3. Storage & Learning

### [locator-memory-store.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/locator-memory-store.js)
**What:** SQLite-based persistence layer (`locator-memory.db`).
**Why:** Provides enterprise-grade concurrency and cross-run learning. Unlike JSON files, SQLite handles parallel CI runs and multi-team environments efficiently.

### [locator-telemetry-engine.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/locator-telemetry-engine.js)
**What:** Captures execution latency, failure types, and fallback depth.
**Why:** This is the feedback loop that enables the system to learn autonomously. Without telemetry, the ranker cannot improve over time.

---

## 4. Failure Recovery (Self-Healing)

### [failure-classifier.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/failure-classifier.js)
**What:** Translates raw Playwright errors into semantic types (e.g., `HYDRATION_PENDING`, `OVERLAY_BLOCKED`).
**Why:** Different failures require different solutions. A "Not Visible" error might need a scroll, while "Detached" needs a re-fetch or healing.

### [healing-engine.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/healing-engine.js)
**What:** Implements the 11-stage fallback pipeline.
**Why:** It follows a strict hierarchy (`testId > role > label > text > AI`). This ensures we always use the most stable locator before escalating to expensive AI rescue.

---

## 5. DOM Awareness

### [dom-volatility-detector.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/dom-volatility-detector.js)
**What:** Detects React fiber, Next.js hydration markers, and active animations.
**Why:** In modern SPAs, elements might be present but not yet "hydrated" and interactive. This module detects that state proactively.

### [wait-strategy-engine.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/wait-strategy-engine.js)
**What:** An adaptive selector for wait strategies (MutationObserver, API specific wait).
**Why:** Replaces generic timeouts with specific, state-based waits, reducing flakiness in complex ecommerce flows.

### [component-boundary-detector.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/component-boundary-detector.js)
**What:** Scopes locators to the nearest semantic parent (e.g., a specific Product Card).
**Why:** Scoped locators are far more stable than global CSS selectors, especially in layouts with repetitive elements like grids or lists.

---

## 6. Enterprise Management

### [locator-version-manager.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/locator-version-manager.js)
**What:** Manages v1, v2, v3 of locators.
**Why:** Vital for A/B testing, branch-specific locators, and seamless rollbacks.

### [locator-map-registry.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/locator-map-registry.js)
**What:** Central registry for locator metadata and known alternatives.
**Why:** Provides the initial "seeds" for the LIE to start its learning process.

### [environment-context-engine.js](file:///Users/varun/IdeaProjects/Playwright-Automation/framework/locator-intelligence/environment-context-engine.js)
**What:** Adjusts scoring based on environment (Prod vs Local).
**Why:** Locators that work on a fast Prod CDN might behave differently on a slower Stage environment.
