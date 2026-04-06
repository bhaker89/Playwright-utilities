# SECTION 16 — CI/CD Integration

This repository includes a GitHub Actions workflow:

- `.github/workflows/playwright.yml`

A typical CI pipeline for this framework should:

---

## 16.1 Expected pipeline flow (high level)

```text
Checkout
  ↓
Install dependencies (npm ci)
  ↓
Install Playwright browsers
  ↓
Set env (TEST_ENV + tokens)
  ↓
Run tests
  ↓
Collect artifacts
  ↓
Publish reports
```

---

## 16.2 Install dependencies

```bash
npm ci
npx playwright install --with-deps
```

---

## 16.3 Execute tests

```bash
npx playwright test
```

For smoke only:

```bash
npx playwright test tests/smoke
```

---

## 16.4 Collect telemetry

Telemetry is written primarily into:

- `framework/locator-intelligence/locator-memory.db`

In CI, you typically archive this file as an artifact, or export summaries into JSON.

---

## 16.5 Generate reports

Outputs commonly used:

- `playwright-report/`
- `test-results/`
- `allure-results/` (if allure is configured in CI)

---

## 16.6 Multi-team best practice

- run smoke suites on every PR
- run full regression nightly
- treat registry changes (`locator-registry/**`) as “config code” with review