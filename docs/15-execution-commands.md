# SECTION 15 — Execution Commands

> Exact scripts vary by `package.json`. This doc lists the most common commands used in this repo plus the platform CLI commands.

All commands assume repo root:

```bash
cd /Users/varun/IdeaProjects/Playwright-Automation
```

---

## 15.1 Run all Playwright tests

```bash
npx playwright test
```

---

## 15.2 Run a suite/folder

```bash
npx playwright test tests/smoke
npx playwright test tests/ui
npx playwright test tests/api
```

---

## 15.3 Run a single test file

```bash
npx playwright test tests/ui/generated/dev_smoke_quick_order.intent.spec.js --headed
```

---

## 15.4 Run with UI (Playwright UI mode)

```bash
npx playwright test --ui
```

---

## 15.5 Run mobile view tests

This repo uses Playwright projects/devices. Run a specific project:

```bash
npx playwright test --project=chromium
# or any configured mobile project name from playwright.config.js
```

---

## 15.6 Platform CLI — intent pipeline

### Validate intent prompt

```bash
node platform/cli/openapi-test-orchestrator.js validate-intent-prompt \
  --prompt specs/intent-prompts/_dev_smoke_quick_order.txt
```

### Generate intent spec (requires LLM provider configuration)

```bash
node platform/cli/openapi-test-orchestrator.js generate-intent-spec \
  --prompt specs/intent-prompts/_dev_smoke_quick_order.txt \
  --out specs/intent/dev_smoke_quick_order.intent.yaml
```

### Ground spec to locator registry

```bash
node platform/cli/openapi-test-orchestrator.js ground-spec \
  --spec specs/intent/dev_smoke_quick_order.intent.yaml \
  --service 1mg-web
```

### Run intent spec

```bash
node platform/cli/openapi-test-orchestrator.js run-intent \
  --spec specs/intent/dev_smoke_quick_order.intent.yaml \
  --service 1mg-web \
  --base-url https://stag.1mg.com \
  --headed
```

### Generate Playwright test from intent spec

```bash
node platform/cli/openapi-test-orchestrator.js generate-intent-test \
  --spec specs/intent/dev_smoke_quick_order.intent.yaml \
  --out tests/ui/generated/dev_smoke_quick_order.intent.spec.js
```