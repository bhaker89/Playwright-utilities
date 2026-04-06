# SECTION 10 — How to Create a New Test (Step-by-Step)

This repo supports **UI**, **API**, and **Hybrid** tests using a unified fixture.

All examples below use:

- `fixtures/base-test.js`

---

## 10.1 Create a UI test

**File:** `tests/ui/<feature>.spec.js`

```js
// file: tests/ui/quick-order-smoke.spec.js
const { test, expect } = require('../../fixtures/base-test');

test('Quick order entry point navigates to prescription order page', async ({ page }) => {
  await page.goto('https://stag.1mg.com/');

  // Minimal approach: plain Playwright
  await page.locator('a[href*="/done-in-one/prescription-order"]').click();

  await expect(page).toHaveURL(/\/done-in-one\/prescription-order/);
  await expect(page.getByText('Upload prescription', { exact: false })).toBeVisible();
});
```

### How LIE participates

If you want the click to go through healing/ranking, you typically route through page objects or UIEngine steps that use SmartLocator.

---

## 10.2 Create an API test

**File:** `tests/api/<service>/<test>.spec.js`

```js
// file: tests/api/example/user-profile.spec.js
const { test, expect } = require('../../../fixtures/base-test');

test('GET /profile returns 200', async ({ apiClient }) => {
  const res = await apiClient.get('/profile');
  expect(res.status).toBe(200);
});
```

---

## 10.3 Create a hybrid test (API seed → UI verify)

```js
// file: tests/integrated/create-and-verify.spec.js
const { test, expect } = require('../../fixtures/base-test');

test('Create entity via API and verify in UI', async ({ apiClient, page, sharedContext }) => {
  const createRes = await apiClient.post('/entities', { name: 'Demo' });
  sharedContext.set('entityId', createRes.body.id);

  const entityId = sharedContext.get('entityId');
  await page.goto(`/entities/${entityId}`);

  await expect(page.locator('h1')).toContainText('Demo');
});
```

---

## 10.4 Create a spec-driven intent test (platform mode)

1. Write prompt: `specs/intent-prompts/<name>.txt`
2. Create/maintain spec: `specs/intent/<name>.intent.yaml`
3. Ground + run:

```bash
node platform/cli/openapi-test-orchestrator.js ground-spec --spec specs/intent/<name>.intent.yaml --service <service>
node platform/cli/openapi-test-orchestrator.js run-intent  --spec specs/intent/<name>.intent.yaml --service <service> --base-url <url> --headed
```

4. Generate Playwright spec:

```bash
node platform/cli/openapi-test-orchestrator.js generate-intent-test --spec specs/intent/<name>.intent.yaml
```

---

## 10.5 Explain the fixtures you will use most

From `fixtures/base-test.js`:

- `page` — Playwright page
- `apiClient` — wrapped request client
- `sharedContext` — cross-step storage
- `ui` — YAML UI engine (step runner)
- `bridge` — single entry point to page objects + helpers