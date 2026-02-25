# Playwright Interview Questions (Framework-Based)

This document contains common Playwright interview questions with practical, **framework-aligned** answers based on this repository’s architecture (fixtures, Page Object Model, shared context, environment config, and reporting).

## Table of Contents

1. [Dynamic elements / changing locators](#1-how-will-you-handle-dynamic-elements-whose-locators-change-every-build)
2. [Multi-tab / new window](#2-how-do-you-automate-a-multi-tab--new-window-scenario-in-playwright)
3. [File download validation](#3-how-will-you-validate-file-download-functionality)
4. [File upload](#4-how-do-you-upload-a-file-using-playwright)
5. [iFrames](#5-how-will-you-handle-iframe-elements)
6. [Capture & validate network responses](#6-how-do-you-capture-and-validate-network-api-responses)
7. [Mock API responses](#7-how-will-you-mock-api-responses-for-testing)
8. [Authentication / login bypass](#8-how-do-you-handle-authentication-login-bypass-in-multiple-test-cases)
9. [Parallel execution](#9-how-will-you-implement-parallel-execution-in-playwright)
10. [Retries for failed tests](#10-how-do-you-retry-failed-tests-automatically)
11. [Shadow DOM](#11-how-will-you-handle-shadow-dom-elements)
12. [Page Object Model (POM)](#12-how-do-you-implement-page-object-model-pom-in-playwright)
13. [Screenshots on failure](#13-how-will-you-take-screenshots-on-failure)
14. [Browser permissions](#14-how-do-you-handle-browser-permissions-notifications-geolocation)
15. [Toast messages / temporary popups](#15-how-will-you-validate-toast-messages--temporary-popups)
16. [Test data for multiple environments](#16-how-do-you-manage-test-data-for-multiple-environments)
17. [CI/CD execution](#17-how-will-you-run-tests-in-cicd-github-actions--jenkins)
18. [Slow-loading elements (no hard waits)](#18-how-do-you-handle-slow-loading-elements-without-using-hard-waits)
19. [Broken links validation](#19-how-will-you-validate-broken-links-using-playwright)
20. [HTML reports generation & sharing](#20-how-do-you-generate-and-share-html-reports)

---

## 1) How will you handle dynamic elements whose locators change every build?

**Best practice (preferred order):**

1. **Use accessibility-first locators** (most resilient):
   - `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`
2. **Use stable test attributes**:
   - `data-testid`, `data-test` (recommended to add in the app)
3. **Use relative/chained locators**:
   - anchor on stable surrounding content and then narrow down
4. **Avoid brittle locators**:
   - auto-generated IDs, dynamic classes, long CSS/XPath

**Framework alignment:**
- The framework’s POM + `pages/base.page.*` concept (documented in `docs/ARCHITECTURE.md`) centralizes locator strategy and helper methods.

**Examples:**

```ts
// Prefer roles / labels / test ids
await page.getByRole('button', { name: 'Save' }).click();
await page.getByLabel('Email').fill('user@test.com');
await page.getByTestId('user-name').fill('Varun');

// If you must anchor: locate a stable container, then narrow down
const card = page.getByRole('region', { name: 'User Details' });
await card.getByRole('textbox', { name: 'Phone' }).fill('9999999999');
```

---

## 2) How do you automate a multi-tab / new window scenario in Playwright?

Use `waitForEvent` and **set the listener before** the click that opens the new tab.

**Example (new tab):**

```ts
const [newPage] = await Promise.all([
  page.context().waitForEvent('page'),
  page.getByRole('link', { name: 'Open Report' }).click(),
]);

await newPage.waitForLoadState();
await expect(newPage).toHaveURL(/report/);
```

**Example (popup event):**

```ts
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  page.getByText('Open in new window').click(),
]);
await popup.waitForLoadState();
```

---

## 3) How will you validate file download functionality?

Use `page.waitForEvent('download')` and validate:
- filename
- download path exists
- optional: file size/content after saving

```ts
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Download CSV' }).click(),
]);

expect(download.suggestedFilename()).toMatch(/\.csv$/);

const path = await download.path();
expect(path).toBeTruthy();

await download.saveAs(`test-results/downloads/${download.suggestedFilename()}`);
```

---

## 4) How do you upload a file using Playwright?

**For `<input type="file">`:**

```ts
await page.setInputFiles('input[type="file"]', 'test-data/sample.pdf');
await page.getByRole('button', { name: 'Upload' }).click();
```

**For custom upload buttons (file chooser):**

```ts
const [chooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.getByRole('button', { name: 'Choose file' }).click(),
]);

await chooser.setFiles('test-data/sample.pdf');
```

---

## 5) How will you handle iframe elements?

Prefer `frameLocator()` (clean + stable):

```ts
const frame = page.frameLocator('#payment-iframe');
await frame.getByRole('textbox', { name: 'Card number' }).fill('4111111111111111');
await frame.getByRole('button', { name: 'Pay' }).click();
```

If needed, you can locate frames via `page.frame({ name/url })`.

---

## 6) How do you capture and validate network API responses?

### A) Wait for a specific response

```ts
const response = await page.waitForResponse(resp =>
  resp.url().includes('/api/users') && resp.status() === 200
);

const body = await response.json();
expect(body.data.length).toBeGreaterThan(0);
```

### B) Listen to response events (for logging/debug)

```ts
page.on('response', async (resp) => {
  if (resp.url().includes('/api/users')) {
    console.log(resp.status(), resp.url());
  }
});
```

**Framework alignment:**
- The framework includes an API utility layer (documented as `utils/api-client.*`) for API testing and request/response logging.

---

## 7) How will you mock API responses for testing?

Use `page.route()` to intercept and `route.fulfill()`.

```ts
await page.route('**/api/users', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [{ id: 1, name: 'Mock User' }] }),
  });
});
```

You can also modify requests:

```ts
await page.route('**/api/**', async route => {
  const req = route.request();
  await route.continue({
    headers: { ...req.headers(), 'x-test-run': 'true' },
  });
});
```

---

## 8) How do you handle authentication (login bypass) in multiple test cases?

**Recommended:** reuse authenticated **storage state**.

Typical steps:
1. Login once (UI or API) in a `global-setup` script
2. Save `storageState` to a file (e.g., `auth.json`)
3. Configure tests to use that state

```ts
// playwright.config.ts (concept)
use: {
  storageState: 'auth.json',
}
```

**Framework alignment:**
- This repository contains `global-setup.js` and `auth.json`, which matches this approach.

---

## 9) How will you implement parallel execution in Playwright?

Configure workers in `playwright.config.*` and ensure tests are isolated.

```ts
// playwright.config.ts (concept)
workers: process.env.CI ? 4 : 2,
fullyParallel: true,
```

**Notes:**
- Avoid sharing mutable global state between parallel tests.
- Use fixtures to set up per-test/per-worker dependencies.

---

## 10) How do you retry failed tests automatically?

Use Playwright config `retries` (often higher on CI) and enable traces on retry.

```ts
// playwright.config.ts (concept)
retries: process.env.CI ? 2 : 0,
use: {
  trace: 'on-first-retry',
},
```

---

## 11) How will you handle shadow DOM elements?

Playwright locators can often work through shadow DOM naturally when you locate the host element and then query inside.

```ts
await page.locator('my-component')
  .getByRole('button', { name: 'Submit' })
  .click();
```

When components are extremely custom, use `evaluate`:

```ts
await page.evaluate(() => {
  const host = document.querySelector('my-component');
  const root = host?.shadowRoot;
  root?.querySelector('button.submit')?.click();
});
```

---

## 12) How do you implement Page Object Model (POM) in Playwright?

**Pattern:**
- Create a class per page/screen.
- Keep locators and actions inside the page class.
- Keep assertions mostly in test files (or provide “state getters”).

```ts
import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  username = () => this.page.getByLabel('Username');
  password = () => this.page.getByLabel('Password');
  loginBtn = () => this.page.getByRole('button', { name: 'Login' });

  async navigate() {
    await this.page.goto('/login');
  }

  async login(user: string, pass: string) {
    await this.username().fill(user);
    await this.password().fill(pass);
    await this.loginBtn().click();
  }
}
```

**Framework alignment:**
- This repo already has `pages/base.page.*` and `pages/login.page.*` as the POM foundation.

---

## 13) How will you take screenshots on failure?

Option A — built-in config:

```ts
// playwright.config.ts (concept)
use: {
  screenshot: 'only-on-failure',
}
```

Option B — fixture hook:
- In `afterEach`, check failure and attach screenshot.

**Framework alignment:**
- The architecture documentation mentions **automatic screenshot on failure** in the base fixture layer.

---

## 14) How do you handle browser permissions (notifications, geolocation)?

Configure permissions in context options:

```ts
// playwright.config.ts (concept)
use: {
  permissions: ['geolocation', 'notifications'],
  geolocation: { latitude: 12.9716, longitude: 77.5946 },
}
```

Or grant dynamically:

```ts
await context.grantPermissions(['geolocation'], {
  origin: 'https://app.example.com',
});
```

---

## 15) How will you validate toast messages / temporary popups?

Use an appropriate locator (test id is best), assert visible + text, optionally assert disappearance.

```ts
const toast = page.getByTestId('toast');
await expect(toast).toBeVisible();
await expect(toast).toContainText('Saved successfully');

// optional: if it should disappear
await expect(toast).toBeHidden();
```

If you don’t have test ids, consider `role="status"` or a stable container.

---

## 16) How do you manage test data for multiple environments?

**Recommended approach:**
- Use `.env.{TEST_ENV}` files + CI secrets
- Use a typed environment loader
- Store reusable datasets in `test-data/` (CSV/JSON)

**Framework alignment (from `docs/ARCHITECTURE.md`):**
- `.env.{TEST_ENV}` selection
- `config/environment.config.*` to parse env vars
- `config/services.yaml` for service endpoints/definitions

Example run:

```bash
TEST_ENV=staging npm test
```

---

## 17) How will you run tests in CI/CD (GitHub Actions / Jenkins)?

**Standard pipeline steps:**
1. Install dependencies
2. Install browsers
3. Lint + typecheck
4. Run tests by suite (UI/API/etc.)
5. Upload reports as artifacts

Example (generic):
- `npm ci`
- `npm run install:browsers`
- `npm run lint && npm run type-check`
- `TEST_ENV=staging npm run test:ui`
- Upload `playwright-report/` and/or `allure-report/`

**Framework alignment:**
- Repo supports multiple reporters (HTML/JSON/JUnit/Allure) and already has CI/CD files like `.gitlab-ci.yml`.

---

## 18) How do you handle slow-loading elements without using hard waits?

Avoid `waitForTimeout`. Use:
- locator auto-wait assertions (`toBeVisible`, `toHaveText`, etc.)
- `waitForLoadState()` when needed
- polling for back-end driven status (`expect.poll`)

```ts
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
await page.waitForLoadState('networkidle');

await expect.poll(async () => {
  return page.getByTestId('job-status').textContent();
}).toContain('Completed');
```

---

## 19) How will you validate broken links using Playwright?

Collect all `a[href]` URLs and validate via `APIRequestContext` (fast and reliable).

```ts
const links = await page.locator('a[href]').evaluateAll(elements =>
  elements.map(el => (el as HTMLAnchorElement).href)
);

for (const url of links) {
  const resp = await page.request.get(url);
  expect(resp.status(), `${url} is broken`).toBeLessThan(400);
}
```

**Tip:** filter out `mailto:`, `tel:`, and internal anchors (`#`).

---

## 20) How do you generate and share HTML reports?

Playwright HTML report is generated under `playwright-report/`.

**Local:**

```bash
npx playwright show-report
```

**Framework alignment (see `README.md`):**
- `npm run report` to view/generate HTML report
- `npm run report:allure` for Allure reporting

**CI/CD sharing:**
- Upload `playwright-report/` (and/or `allure-report/`) as pipeline artifacts.
- Share the artifact URL from GitHub Actions/Jenkins/GitLab.