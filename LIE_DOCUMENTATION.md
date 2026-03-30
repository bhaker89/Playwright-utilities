# Locator Intelligence Engine (LIE) Documentation

This document maps the user-facing framework behavior to its internal logic, implementation, and execution flow. It is crucial for senior engineers and framework contributors to understand the mechanics that drive robust Playwright automation.

---

## EXECUTION FLOW DIAGRAMS

### General Test Execution Lifecycle
```text
CLI
 ↓
Playwright Config
 ↓
Fixtures
 ↓
Browser Launch
 ↓
Test Execution
 ↓
Reporter
```

### Locator Intelligence Engine (LIE) Orchestration Pipeline
```text
User Locator Action
 ↓
Locator Orchestrator
 ↓
Wait Strategy Engine
 ↓
Playwright Execution (Passes) ─────┐
 ↓ (If Timeout/Failure)            │
Failure Classifier                 │
 ↓                                 │
Healing Pipeline                   │
 ├─ Stage 1: Memory/Registry       │
 ├─ Stage 2: Fuzzy DOM Traversal   │
 └─ Stage 3: LLM Rescue            │
 ↓                                 │
Telemetry Logging                  │
 ↓                                 │
Return ◀───────────────────────────┘
```

---

## 1. Framework Initialization

**Logic:**
Loads environment variables, configures execution parameters (retries, timeouts, workers), defines browser projects, and handles global setup (like authentication) before any test starts.

**Implementation:**
- **file:** `playwright.config.js`
- **method:** `defineConfig()`

**Execution Flow:**
CLI execution → `dotenv` parses `config/.env.<env>` based on `TEST_ENV` → Playwright config object evaluated → Global setup/dependencies resolved (`setup` project for storageState).

---

## 2. Environment Switching

**Logic:**
Dynamically points tests to different application and API environments without code changes.

**Implementation:**
- **file:** `playwright.config.js`
- **method:** Top-level scope via variable declaration `const environment = process.env.TEST_ENV || 'stag'`

**Execution Flow:**
`process.env.TEST_ENV` overrides default → config loaded via `dotenv.config({ path: ... })` → Inject `process.env.BASE_URL` into `use.baseURL`.

---

## 3. Fixtures Lifecycle

**Logic:**
Injects necessary objects into the test context, handling setup before the test and teardown after.

**Implementation:**
- **file:** `fixtures/base-test.js`
- **method:** `test = base.extend({...})` (Playwright fixture extension)

**Execution Flow:**
Playwright engine resolves dependencies → `apiClient` initialized → `bridge` initialized (encapsulates page objects and wrappers) → passed directly to test parameters `({ bridge })` → test completes → automatic teardown sequence inside fixture `use()` block.

---

## 4. Browser Launch Logic

**Logic:**
Configures isolated browser contexts tailored specifically for desktop browsers, mobile viewports, or API-only runners.

**Implementation:**
- **file:** `playwright.config.js`
- **method:** Inside `projects:` definitions.

**Execution Flow:**
Config projects load definitions (e.g. `devices['Desktop Chrome']`) → Setup project initializes browser and writes `storageState` `.auth/user.json` → Test project injects state.

---

## 5. Page Object Binding

**Logic:**
Provides a central gateway (`bridge`) to access initialized singleton instances of Page Objects and action wrappers, preventing boilerplate instantiations inside specs.

**Implementation:**
- **file:** `utils/ui/bridge.js`
- **method:** `Bridge.getInstance(page)` and internal page class singletons handling.

**Execution Flow:**
Test requests `bridge` fixture → Fixture calls `Bridge.getInstance()` → Bridge properties instantiated lazily or immediately → Test accesses business functions via `bridge.loginPage.login()`.

---

## 6. Selectors Loading

**Logic:**
Selectors are defined lazily as properties or getters on Page Objects to avoid stale element executions.

**Implementation:**
- **file:** `pages/base.page.js` and custom page object definitions.
- **method:** `get myElement() { return this.page.locator(...) }`

**Execution Flow:**
Page Object initiated → Test calls a method interacting with an element → Getter runs → Playwright executes lazy element detection against live DOM.

---

## 7. Parallelization Logic

**Logic:**
Executes multiple test files (or tests) concurrently to minimize total suite runtime, leveraging Playwright's native worker capabilities.

**Implementation:**
- **file:** `playwright.config.js`
- **method:** `fullyParallel: true` and `workers: process.env.CI ? 4 : undefined`

**Execution Flow:**
Playwright spawns multiple isolated OS processes (workers) → Each worker creates an isolated browser context → Tests execute concurrently → `locator-memory-store.js` utilizes SQLite WAL mode to support parallel telemetry writes safely.

---

## 8. Hooks Execution Order

**Logic:**
Maintains robust execution structures spanning setups, preconditions, teardowns, and artifact collection.

**Implementation:**
- **file:** Inside specs via native Playwright capabilities (`test.beforeAll`, `test.beforeEach`, `test.afterEach`).
- **method:** Playwright intrinsic hooks execution.

**Execution Flow:**
Worker Start → `test.beforeAll` → Context creation → `test.beforeEach` → Test action → `test.afterEach` (Artifact generation/Screenshots processing) → Context teardown → `test.afterAll`.

---

## 9. Test Data Injection

**Logic:**
Feeding dynamic or scenario-specific data into test executions without hardcoding values in specs.

**Implementation:**
- **file:** Various spec files referencing `config/` or `test-data/` payloads.
- **method:** Manual `require` imports and dotenv resolutions inside `playwright.config.js`.

**Execution Flow:**
Values load from environment or JSON files during test run mapping → Variables substituted in Playwright assertions, requests, and Page Object methods.

---

## 10. Locator Intelligence: Orchestration

**Logic:**
The core routing and evaluation engine for UI interactions, decoupling standard Playwright calls into the sophisticated LIE pipeline.

**Implementation:**
- **file:** `framework/locator-intelligence/locator-orchestrator.js`
- **method:** Orchestrator execution layer for receiving `healer.executeWithHealing()` requests.

**Execution Flow:**
Action request passes locator → Routes to `locator-orchestrator` → Resolves wait states → Attempts standard interaction prior to throwing errors.

---

## 11. Adaptive Wait Logic

**Logic:**
Detects framework state (e.g., React Hydration, Next.js transitions) and applies context-aware waiting strategies instead of relying on arbitrary static timeouts.

**Implementation:**
- **file:** `framework/locator-intelligence/wait-strategy-engine.js` (working with `dom-volatility-detector.js`)
- **method:** Proactive DOM volatility observation before taking action.

**Execution Flow:**
Locator execution starts → `dom-volatility-detector.js` checks page state → `wait-strategy-engine.js` creates appropriate `MutationObserver` or equivalent loops → Blocks UI execution until readiness state achieved.

---

## 12. Failure Classification Logic

**Logic:**
Translates cryptic Playwright timeout/action errors into semantic failure categories to determine the appropriate recovery strategy (e.g. knowing if an element is detached versus obscured by an overlay).

**Implementation:**
- **file:** `framework/locator-intelligence/failure-classifier.js`
- **method:** String parsing mapping standard WebDriver/Playwright exceptions to specific Error Codes.

**Execution Flow:**
Playwright throws `TimeoutError` or similar exception → Caught by Orchestrator wrapper → Parsed by `failure-classifier.js` → Returns a semantic type (e.g., `HYDRATION_PENDING` or `DETACHED`).

---

## 13. Retry Strategy & Healing Configuration

**Logic:**
The 3-stage fallback pipeline that recovers structurally compromised locators on the fly. 

**Implementation:**
- **file:** `framework/locator-intelligence/healing-engine.js`
- **method:** Core healing loop triggering three distinct remediation stages.

**Execution Flow:**
Classifier flags broken locator → `healing-engine.js` is invoked:
1. `locator-memory-store.js` Memory Stage (Registry fallback).
2. Fuzzy Stage (Text analysis and mapping).
3. AI Generation Stage (`core/ai-engine.js` DOM submission to LLM).
↓
Applies healed locator → Executes successfully → Logs event.

---

## 14. Entropy Scoring Logic

**Logic:**
Assesses the structural fragility of a selector and computes an automated long-term reliability penalty based on complexity or unstable markers (like `nth-child`).

**Implementation:**
- **file:** `framework/locator-intelligence/selector-stability-evaluator.js`
- **method:** Evaluator computation assigning numerical penalties.

**Execution Flow:**
Healed locator identified → `selector-stability-evaluator.js` calculates fragility → Steers Locator Ranker toward more reliable semantic nodes.

---

## 15. Confidence Engine Logic (If exists)

**Logic:**
Analyzes the cumulative score of a locator and triggers automated refactoring alerts if safety thresholds drop.

**Implementation:**
- **file:** `framework/locator-intelligence/confidence-engine.js`
- **method:** Composite scoring algorithm yielding score between 0.0 and 1.0.

**Execution Flow:**
Post-execution evaluation → Score computed via history and entropy → Flags reporting tools if confidence drops below `< 0.40`.

---

## 16. Reporter Pipeline

**Logic:**
Aggregates logs, test artifacts, and traces into centralized formats for humans and CI servers.

**Implementation:**
- **file:** `playwright.config.js`
- **method:** `reporter` array matrix `['html', 'json', 'allure-playwright']`.

**Execution Flow:**
Test pipeline completes → Artifacts built by worker → Reporters execute sequentially combining all metadata asynchronously into `playwright-report/` and `test-results/` directories.

---

## 17. Telemetry & Analytics Capture

**Logic:**
Monitors and persists the underlying performance, failure rates, and healing events of the framework execution sequence reliably across many parallel nodes.

**Implementation:**
- **file:** `framework/locator-intelligence/locator-telemetry-engine.js`
- **method:** `isFlushing` semaphore controlled file locks tracking latency and failures.

**Execution Flow:**
Event concludes → Engine captures duration and healing metadata → Queue accumulates output → Safely flushed to SQLite store without racing other workers.

---

## 18. Screenshot, Video Capture, and Trace Logic

**Logic:**
Retains visual verifications and complete network/DOM histories automatically on failure patterns securely.

**Implementation:**
- **file:** `playwright.config.js`
- **method:** `use.screenshot`, `use.video`, `use.trace` blocks configuration.

**Execution Flow:**
Config loaded with "only-on-failure" options → Test run observes passing/failing state natively → Failed assertions trigger built-in event generation capturing media directly attached to HTML and Allure reporting streams.

---

## 19. CI Execution Pipeline & Tag Filtering Logic

**Logic:**
Controls test boundaries and executions directly within cloud runners securely via tags.

**Implementation:**
- **file:** `.gitlab-ci.yml` (and potentially GitHub/Jenkins files).
- **method:** Native Playwright CLI capability string passing `--grep` and `CI=true` override environment settings inside `playwright.config.js`.

**Execution Flow:**
Pipeline invokes container → Issues run command targeting spec descriptions `("@smoke", "@regression")` → Matches filter array directly against loaded Playwright trees before worker creation ensuring speed.
