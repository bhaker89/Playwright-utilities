# Playwright Automation Framework

## SECTION 1 — Framework Overview

**What this framework is:**
This is an enterprise-grade UI and API automation framework built on Playwright and Node.js. It features a Page Object Model (POM) architecture, integrated API testing, and a powerful AI-driven Locator Intelligence Engine (LIE) for self-healing tests.

**Why it exists:**
To provide a single, unified automation platform that is robust, scalable, and easy to use across all teams, eliminating the fragmentation of having different tools for UI, API, and mobile web testing.

**What problems it solves:**
- **Flaky Tests:** Playwright's native auto-waiting combined with our 3-stage self-healing (SmartLocator) eliminates false failures caused by dynamic content or broken selectors.
- **Maintenance Overhead:** The Locator Intelligence Engine automatically recovers from UI changes and broken locators without requiring manual test code updates.
- **Complex Setup:** Provides a simple, unified setup for cross-browser, mobile web, and API testing with integrated reporting.

**Who should use it:**
QA Engineers, Automation Developers, and anyone responsible for testing web applications or APIs within the organization.

## SECTION 2 — Architecture Diagram

```text
┌────────────────────────────────────────────────────────┐
│                    TEST SUITES                         │
│  UI Tests | API Tests | Hybrid Tests | No-Code Tests   │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────┴─────────────────────────────────┐
│                    FIXTURES                            │
│  base-test.js (bridge, apiClient, sharedContext)       │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────┴─────────────────────────────────┐
│                 PAGE OBJECT MODELS                     │
│  BasePage | LoginPage | CheckoutPage | etc.            │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────┴─────────────────────────────────┐
│           LOCATOR INTELLIGENCE ENGINE (LIE)            │
│  SmartLocator | Healing Engine | Telemetry Store       │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────┴─────────────────────────────────┐
│           PLAYWRIGHT EXECUTION ENGINE                  │
│  Browser Launch | Network Control | DOM Interaction    │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────┴─────────────────────────────────┐
│                 REPORTERS & LOGS                       │
│  HTML | Allure | JUnit | JSON | Healing Analytics      │
└────────────────────────────────────────────────────────┘
```

## SECTION 3 — Installation Steps

Follow these exact steps to set up the framework and run your first test.

**Step 1:** clone repo
```bash
git clone <repository_url>
cd Playwright-Automation
```

**Step 2:** install dependencies
```bash
npm install
```

**Step 3:** install browsers
```bash
npx playwright install --with-deps
```

**Step 4:** configure environment
```bash
cp .env.example config/.env.stag
# Open config/.env.stag and set BASE_URL, API_BASE_URL, and credentials
```

**Step 5:** verify installation
```bash
npx playwright test --project=setup
```
*(This step runs the global authentication setup to verify the framework can execute properly.)*

## SECTION 4 — Running Tests

Run tests using the Playwright CLI. Our framework is configured with multiple projects.

**run single test**
```bash
npx playwright test tests/ui/login.spec.js -g 'specific test title'
```

**run test file**
```bash
npx playwright test tests/ui/login.spec.js
```

**run tagged tests**
```bash
npx playwright test --grep "@smoke"
```

**run suite**
```bash
npx playwright test tests/ui/
```

**run parallel tests**
```bash
# By default, tests run in parallel. To control workers:
npx playwright test --workers=4
```

**run headed mode**
```bash
npx playwright test --headed
```

**run debug mode**
```bash
npx playwright test --debug
```

**run specific browser**
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
```

**run CI mode**
```bash
CI=true npx playwright test
```

## SECTION 5 — Project Folder Structure

- **`tests/`**: Contains all executable test specs. Subdirectories include `ui/`, `api/`, `integrated/`, and `setup/`.
- **`pages/`**: Contains all Page Object Models (e.g., `login-page.page.js`). This is where UI elements and business actions are defined.
- **`fixtures/`**: Contains `base-test.js`, providing injected dependencies like `bridge`, `apiClient`, and `sharedContext` to every test.
- **`utils/`**: Shared helper functions, API clients, UI wrappers (`bridge.js`), and common utilities used across tests.
- **`config/`**: Environment configurations (`.env.*`), service definitions, and test data configurations.
- **`data/`** / **`test-data/`**: Static test data files (JSON/CSV) representing user personas or testing matrices.
- **`reporters/`** (and `reports/`, `test-results/`): Output directories and custom reporting configurations for HTML reports, JSON logs, traces, screenshots, videos, and healing analytics.

## SECTION 6 — Writing Your First Test

**Step 1: create test file**
Create a new file `tests/ui/my-first-test.spec.js`.

**Step 2: import fixtures**
Import the `test` and `expect` objects from our custom `base-test.js` fixture.

**Step 3: write test**
Use the injected `bridge` fixture to interact with Page Objects.

**Step 4: execute test**
Run `npx playwright test tests/ui/my-first-test.spec.js`.

**Step 5: view report**
Run `npx playwright show-report`.

**Example Snippet:**
```javascript
const { test, expect } = require('../../fixtures/base-test');

test('Search functionality works', async ({ bridge }) => {
  // Navigate using a page object inside the bridge
  await bridge.homePage.navigate();
  
  // Perform an action
  await bridge.homePage.searchFor('Laptop');
  
  // Validate using the assert wrapper
  await bridge.assert.toBeVisible('.search-results-title', 'Search Results Title');
  await bridge.assert.toHaveText('.search-results-title', 'Results for Laptop', 'Search Results Title');
});
```

## SECTION 7 — Selectors Strategy

**How selectors should be written:**
Prefer robust, semantic selectors over brittle XPath or complex CSS paths. The recommended order is: `ByRole` > `ByText` > `ByTestId` (`data-testid`) > Semantic CSS (`.product-card`). Avoid index-based selectors (`nth-child`).

**Where selectors live:**
All selectors must live inside the Page Object Models (`pages/` directory). Tests should never contain raw Playwright locators (e.g., `page.locator('.btn')`). 

**Recommended practices:**
Name elements logically (e.g., `'Submit Button'`) when passing them to interactions. The SmartLocator uses these names for self-healing and logging.

## SECTION 8 — Test Data Strategy

**Where test data lives:**
- Environment-specific data (e.g., endpoints, tokens) lives in `config/.env.<env>`.
- Shared testing personas, complex payloads, and permutations live in `test-data/` (or `data/`).

**How it is loaded:**
- Environment variables are automatically loaded by `playwright.config.js` via `dotenv` based on the `TEST_ENV` variable.
- Static data files are imported directly using `require()` or dedicated utility loaders.

**How environment overrides work:**
Running `TEST_ENV=stag npx playwright test` loads `config/.env.stag` instead of other environments.

## SECTION 9 — Reporting

**HTML reports:**
Playwright's default interactive report is generated in the `playwright-report/` directory.

**Screenshots:**
Captured automatically "only on failure" and saved alongside test results inside `test-results/`.

**Videos:**
Recorded automatically on failure (e.g. `retain-on-failure` configuration) and saved in `test-results/`.

**Logs:**
Verbose framework logs, CI logs, and SmartLocator healing analytics are kept in `reports/` and `logs/`.

## SECTION 10 — Debugging Failures

When a test fails, you have multiple built-in tools at your disposal:

**Trace viewer:**
A fully interactive DOM snapshot and network timeline.
`npx playwright show-trace test-results/<test-folder>/trace.zip`

**Screenshots:**
Automatically attached to your HTML report for visual state confirmation.

**Logs:**
Console outputs print the exact wrapped action that failed (e.g., `[Wrapper] 🖱️ Click: Submit Button`).

**Retry strategy:**
On CI, tests are configured to retry automatically. Traces are explicitly retained for failed retries so you can examine flakiness.

## SECTION 11 — CI/CD Execution

**How framework integrates with pipelines:**
The framework runs easily inside Docker or pipelines like GitLab CI/GitHub Actions using `CI=true npx playwright test`. In CI mode, Playwright enables optimized parallelism, retries, trace retention, and headless execution.

## SECTION 12 — Best Practices

**Naming conventions:**
Name test files `.spec.js`. Name page objects `.page.js`.

**Test isolation:**
Every test must start with a clean state. Playwright creates a completely fresh, isolated Browser Context for every test to prevent crossover states.

**Tagging strategy:**
Tag your test descriptions (e.g., `test('Login flow @smoke', ...)`) to allow focused suite execution using `--grep "@smoke"`.

**Parallel safety:**
Don't use hardcoded datastore IDs if tests mutate data. Assume your test will run at the exact same time as many others. Maintain independence via setup mocks or unique dynamic IDs.
