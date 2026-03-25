# dWeb Playwright Automation Suite

**Enterprise-Grade UI · API · AI-Augmented Test Automation**

---

## Copy/Paste Friendly Summary (Plain Text)

If you need to share this in chat tools (Flock/Slack/Jira/email) where Markdown can break, use one of the options below.

### Option A: "Code block" (best if Flock keeps monospaced blocks)

```
dWeb Playwright Automation Suite

What you get
- UI automation (Page Object Model) + cross-browser + mobile web
- API automation (Playwright request + multi-service clients)
- Integrated tests (UI + API in the same spec)
- SmartLocator self-healing (registry -> fuzzy -> LLM rescue)
- AI-assisted test generation (natural language / curl -> tests)

Quick start
1) Install
   - npm install
   - npm run install:browsers
2) Configure env
   - cp .env.example config/.env.stag
   - Edit config/.env.stag (BASE_URL, API_BASE_URL, credentials, LLM keys)
3) Run
   - npm test
   - npm run test:api
   - npm run test:chrome
   - npm run ui

Useful
- View trace: npx playwright show-trace test-results/*/trace.zip
- Generate:   npm run generate:ui-test
- Generate:   npm run generate:from-curl
```

### Option B: "No formatting" (works even if Flock strips code blocks)

dWeb Playwright Automation Suite
What you get: UI + API + Integrated tests + SmartLocator self-healing + AI generation
Quick start: npm install | npm run install:browsers | cp .env.example config/.env.stag | npm test

---

## 📖 Table of Contents

- [Why Adopt This Across dWeb?](#-why-adopt-this-across-dweb)
- [Why Playwright over Selenium?](#-why-playwright-over-selenium)
- [What is this Framework?](#-what-is-this-framework)
- [Architecture Overview](#-architecture-overview)
- [Stakeholder HLD: UI + API + Integrated Execution Model](#stakeholder-hld-ui--api--integrated-execution-model)
- [Test Data & Prompt Governance Policy](#test-data--prompt-governance-policy)
- [How UI Automation Works — Step by Step](#-how-ui-automation-works--step-by-step)
  - [Step 1 — User Input](#step-1--user-input-typing-clicking-selecting)
  - [Step 2 — Assertions & Validation](#step-2--assertions--validation)
  - [Step 3 — No-Code AI Generation (Simple English CLI)](#step-3--no-code-ai-generation-simple-english-cli)
- [AI-Powered Test Generation](#-ai-powered-test-generation)
- [SmartLocator — Self-Healing](#-smartlocator--3-stage-self-healing)
- [API Testing](#-api-testing)
- [Reporting & Observability](#-reporting--observability)
- [CI/CD & Docker](#-cicd--docker)
- [Quick Start](#-quick-start)
- [Feature Matrix](#-feature-matrix)

---

## 🎯 Why Adopt This Across dWeb?

> **One framework. All teams. Full coverage — UI, API, mobile web, and multi-service flows — from a single codebase.**

Today, dWeb automation is fragmented: different teams maintain different scripts in different tools with no shared standards, no reusability, and no organisation-level visibility into test health. This framework is the answer.

### The Business Case in Six Points

| # | Problem Today | What This Framework Delivers |
|---|---|---|
| 1 | **Flaky tests waste engineering time** | Playwright's built-in auto-wait + AI self-healing eliminates false failures |
| 2 | **Selenium scripts break on every UI deploy** | SmartLocator auto-recovers broken selectors — 3 stages, including LLM rescue |
| 3 | **QA can't scale — manual testing bottleneck** | AI generates working tests from a plain-English description in seconds |
| 4 | **Debugging CI failures takes hours** | Full video recording + DOM snapshots + network trace on every failure |
| 5 | **No-code testers and BAs can't write tests** | Simple English CLI: describe the test, and the AI generates the Page Objects + Test Spec for you |
| 6 | **Multi-service coverage requires 3 different tools** | UI + API + multi-service HTTP in one test — one report, one runner |

### Why "All dWeb Teams" Should Use This

- **Single source of truth**: all test scripts live in Git alongside the application. PRs, reviews, history — exactly like production code.
- **Shared page objects**: `CheckoutPage`, `LoginPage`, `SearchPage` are authored once and reused across every squad's test file.
- **Multi-environment out of the box**: `TEST_ENV=stag npm test` vs `TEST_ENV=prod npm test` — no script changes, just a flag.
- **Onboarding time**: A new QA engineer writes their first Playwright spec in under an hour using the interactive AI generator CLI.
- **Regulatory & audit trail**: Allure reports, JUnit XML, and healing analytics give management a timestamped record of what was tested and what passed/failed — every release.

---

## ⚡ Why Playwright over Selenium?

### Architecture Difference

```
Selenium (2004):     Test Code → HTTP round-trips (~50–100ms each) → Browser
Playwright (modern): Test Code → WebSocket / CDP (sub-millisecond)  → Browser
```

The consequence of this architectural gap shows up in five areas:

### 1. Auto-Waiting — Flakiness Eliminated

**Selenium**: Every `.click()` fires immediately. Engineers manually sprinkle `Thread.sleep()` or `WebDriverWait` to handle dynamic pages. Miss one → flaky test.

```java
// ❌ Selenium — manual, error-prone
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
WebElement btn = wait.until(ExpectedConditions.elementToBeClickable(By.id("add-to-cart")));
btn.click();
```

**Playwright**: Every action *automatically* waits for the element to be visible, stable, enabled, and not obscured — before acting. Zero manual waits.

```javascript
// ✅ Playwright — auto-wait is implicit, always
await page.locator('[data-testid="add-to-cart"]').click();
```

### 2. No More Stale Elements

Selenium's `WebElement` is a DOM snapshot — it goes stale after any page update (a price recalculation, a React re-render). Playwright's `Locator` is a *lazy reference* re-resolved at the moment of each interaction.

```javascript
// ❌ Selenium — StaleElementReferenceException after cart recalculates
WebElement price = driver.findElement(By.cssSelector(".price"));
// ... cart recalculates ...
price.getText(); // BOOM

// ✅ Playwright — re-queries DOM on every call, always fresh
const price = page.locator('.price');
await price.textContent(); // always current
```

### 3. Network-Level Control

Playwright talks to the browser at the protocol level — it can intercept, modify, or mock any network request. Selenium cannot.

```javascript
// Mock an API response for isolated frontend testing
await page.route('**/api/v2/cart**', route =>
  route.fulfill({ status: 200, body: JSON.stringify({ items: [], total: 0 }) })
);

// Assert the exact API payload the UI sends when a button is clicked
const [req] = await Promise.all([
  page.waitForRequest('**/api/v2/order/place**'),
  checkoutPage.clickPlaceOrder()
]);
expect(req.postDataJSON().paymentMethod).toBe('cod');
```

### 4. Test Isolation Without Overhead

**Selenium**: Each isolated test = new browser launch = 3–8 seconds overhead.  
**Playwright**: Each test gets a fresh *browser context* (isolated cookies, session, storage) inside the same browser process = <100ms.

> **100 tests: Selenium ≈ 8 min of spinup. Playwright ≈ 30 seconds.**

### 5. Forensic Debugging on CI

**Selenium** CI failure: stack trace + maybe a screenshot.  
**Playwright** CI failure: full **video recording** + **DOM snapshot at every step** + **network waterfall** + **console errors** — packaged in one `.zip`, viewable in a UI.

```bash
npx playwright show-trace test-results/*/trace.zip
```

### Selenium vs. Playwright — Head-to-Head

| Capability | Selenium / automation-core | dWeb Playwright Suite |
|---|---|---|
| Auto-wait | ❌ Manual `WebDriverWait` | ✅ Built-in every action |
| Stale element errors | ❌ Common, hard to reproduce | ✅ Impossible — lazy locators |
| Network interception | ❌ Not supported | ✅ First-class (`page.route`) |
| Test isolation | ⚠️ New browser = 3–8s | ✅ New context = <100ms |
| Parallel execution | ⚠️ Selenium Grid required | ✅ Built-in, zero infra |
| Debugging on CI | ❌ Screenshot + stack trace | ✅ Video + trace + DOM |
| API testing | ❌ Separate tool needed | ✅ Native, built-in |
| Mobile web | ⚠️ Limited | ✅ 100+ device presets |
| Self-healing | ❌ None | ✅ 3-stage AI healing |
| Test generation | ❌ Manual only | ✅ LLM from natural language |

---

## 🎯 What is this Framework?

**dWeb Playwright Suite** is an enterprise test platform built on [Microsoft Playwright](https://playwright.dev), providing:

1. **Code-first UI automation** — Page Object Model in JavaScript, lives in Git, reviewed in PRs
2. **3-stage AI self-healing** (`SmartLocator`) — automatically recovers broken selectors without touching test code
3. **Native API testing** — multi-service HTTP clients, response chaining, schema validation
4. **AI test generation** — generates Page Objects and tests from simple English descriptions — no manual coding required

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                   dWeb Playwright Suite                       │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│  Pages/      │  Platform/   │  Utils/      │   AI CLI        │
│  POM Layer   │  AI + Core   │  API + UI    │   (Generator)   │
└──────────────┴──────────────┴──────────────┴─────────────────┘
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
      ┌─────────┐   ┌──────────┐   ┌──────────┐
      │Chromium │   │ Firefox  │   │  WebKit  │
      │(Chrome/ │   │          │   │ (Safari) │
      │  Edge)  │   │          │   │          │
      └─────────┘   └──────────┘   └──────────┘
```

```
Playwright-Automation/
├── pages/                     # Page Object Models
│   ├── base.page.js           # SmartLocator + overlay clearing
│   ├── login-page.page.js
│   └── checkout-page.page.js
├── fixtures/
│   └── base-test.js           # All fixtures: apiClient, sharedContext, bridge…
├── tests/
│   ├── ui/                    # Browser UI specs
│   ├── api/                   # API specs
│   ├── integrated/            # Hybrid UI + API tests
│   └── integration/           # Self-healing tests
├── platform/
│   ├── core/smart-locator.js  # 3-stage self-healing engine
│   ├── core/ai-engine.js      # LLM provider interface
│   ├── engines/               # Assertion engine, variable manager
│   └── cli/                   # AI-guided test generation CLI
├── tests/ui/generated/        # AI-generated Page Objects and Specs
├── playwright.config.js       # Multi-browser, multi-env config
├── .gitlab-ci.yml             # CI/CD pipeline
└── docker-compose.yml
```

---

## Stakeholder HLD: UI + API + Integrated Execution Model

This section is optimized for architecture review with engineering managers and platform stakeholders.

### 1) System Layers (What runs where)

| Layer | Responsibility | Key Files |
|---|---|---|
| **Execution Layer** | Browser/API execution, retries, reporting, artifacts | `playwright.config.js`, `global-setup.js` |
| **Test Abstraction Layer** | Reusable fixtures, bridge, page objects, wrappers | `fixtures/base-test.js`, `pages/*.page.js`, `utils/ui/bridge.js` |
| **Resilience Layer** | SmartLocator healing + component registry + healing analytics | `platform/core/smart-locator.js`, `platform/core/component-registry.js`, `platform/core/healing-reporter.js` |
| **API Integration Layer** | Multi-service API clients + service registry + auth injection | `utils/api/multi-service-api-client.js`, `config/services.config.js` |
| **Generation Layer** | Natural-language test generation and orchestration | `platform/cli/ui-test-generator-cli.js`, `platform/generators/ui-test-code-generator.js` |

### 2) Runtime Flow (UI + API + Integrated)

```text
CLI / Spec
   ↓
Playwright Runner (projects: setup, api, chromium/firefox/webkit/edge/mobile)
   ↓
setup project creates/refreshes .auth/user.json
   ↓
all UI/API projects reuse storageState for authenticated execution
   ↓
fixtures/base-test.js injects apiClient/sharedContext/bridge/page fixtures
   ↓
UI actions route through BasePage → SmartLocator (3-stage healing)
   ↓
API calls route through APIClientFactory → MultiServiceAPIClient
   ↓
assertions + reporting (HTML, Allure, JUnit, healing analytics)
```

### 3) Playwright Features Used in This Codebase (with real examples)

#### a) Custom fixtures for scalable test composition
From `fixtures/base-test.js`, this framework extends Playwright test with reusable fixtures:

- `apiClient` (native request wrapper)
- `sharedContext` (cross-step state)
- `getServiceClient` (service-specific client factory)
- `bridge` (single entry point for UI + API + assertions)

```javascript
const test = base.extend({
  apiClient: async ({ request }, use) => {
    const client = new APIClient(request);
    await use(client);
  },
  getServiceClient: async ({ request }, use) => {
    const factory = (serviceName) => APIClientFactory.createClient(serviceName, request);
    await use(factory);
  },
  bridge: async ({ page, apiClient }, use) => {
    const bridge = Bridge.getInstance(page, apiClient);
    await use(bridge);
  },
});
```

#### b) Auto-wait + strict action timeout + self-healing
From `pages/base.page.js`, all major actions use SmartLocator wrapper:

```javascript
async fill(locator, value, fieldName) {
  await this.healer.executeWithHealing(fieldName || 'field', locator, async (loc) => {
    await loc.fill(value, { timeout: 3000 });
  });
}

async click(locator, elementName) {
  await this.healer.executeWithHealing(elementName || 'element', locator, async (loc) => {
    await loc.click({ timeout: 3000 });
  });
}
```

#### c) SmartLocator 3-stage rescue engine
From `platform/core/smart-locator.js`:

1. **Stage 1**: registry lookup for cached healed selector
2. **Stage 2**: fuzzy text fallback (`text="..."`)
3. **Stage 3**: LLM-driven selector inference from DOM snapshot

This is executed transparently via:

```javascript
await this.healer.executeWithHealing(elementName, originalLocator, actionFn);
```

#### d) Auth reuse through Playwright `storageState`
From `tests/setup/auth.setup.js` and `playwright.config.js`:

- setup project creates `.auth/user.json`
- API and UI browser projects depend on `setup`
- all projects consume `storageState: '.auth/user.json'`

This avoids repeating login in every test and keeps UI/API auth aligned.

#### e) Cross-browser + mobile projects in one runner
From `playwright.config.js` projects:

- `api`
- `chromium`, `firefox`, `webkit`, `edge`
- `Mobile Chrome` (Pixel 5), `Mobile Safari` (iPhone 13)

This is the reason one framework can serve both **dWeb + mWeb**.

#### f) Integrated UI + API in a single test
From `tests/examples/ui-bridge-pattern.spec.js`:

```javascript
test('UI + API integrated test', async ({ bridge }) => {
  const response = await bridge.apiClient.get('/api/user/profile');
  expect(response.status).toBe(200);

  bridge.context.set('userId', response.body.id);
  await bridge.goto(`https://www.1mg.com/profile/${bridge.context.get('userId')}`);
  await bridge.assert.toContainText('.user-name', response.body.name, 'User Name');
});
```

### 4) Why this architecture is approval-ready for dWeb/mWeb

- **Single automation platform** for UI + API + integrated flows
- **Reusable fixtures and bridge pattern** minimize duplication
- **Self-healing reduces flaky maintenance overhead**
- **Cross-browser/mobile matrix built-in** (not bolted on)
- **CI-ready observability** with trace/video/allure/healing analytics

---

## Test Data & Prompt Governance Policy

### Policy Objective
Keep generated tests maintainable, secure, and reusable across teams and services.

### Golden Rule
**Prompts define flow behavior; data sources define values.**

### Source of Truth Matrix

| Data Type | Source | Example |
|---|---|---|
| Secrets, OTP, credentials, tokens | `config/.env.<env>` | `TEST_MOBILE`, `TEST_OTP`, `NEXUS_AUTH_TOKEN` |
| Environment URLs/config | `config/.env.<env>` | `UI_BASE_URL`, `API_BASE_URL`, `INTERNAL_API_BASE_URL` |
| Reusable personas/test users | `test-data/*.json` | `test-data/auth-credentials.json` |
| High-volume matrix data | `test-data/*.csv` | search x pincode x payment combinations |
| Assertions and business flow | Test specs / page objects | URL checks, visual checks, API contract checks |

### Prompt Authoring Rules

✅ Include in prompt:
- user journey steps
- expected outcomes/assertions
- negative and edge coverage requirements
- placeholders (`{{mobile}}`, `{{otp}}`, `{{searchQuery}}`)

❌ Do not include in prompt:
- real credentials / tokens
- environment secrets
- one-off hardcoded test users intended for long-term reuse

### Implementation Rules for Generated Tests

1. Generated specs should reference variables/placeholders (not raw secrets).
2. Secret resolution should happen at runtime from env.
3. Persona data should be loaded from `test-data` (JSON preferred for nested data).
4. CSV should be used only for large tabular permutations.
5. Assertions stay in code, not in data files.

### Tata 1mg Login Example (recommended)

- Prompt: *"Generate login flow with valid and invalid user scenarios using `{{mobile}}` and `{{otp}}` placeholders."*
- Runtime values:
  - valid user mobile/otp from `config/.env.stag`
  - secondary/invalid users from `test-data/auth-credentials.json`

This keeps login tests reusable even when credentials rotate.

---

## 📄 How UI Automation Works — Step by Step

This is the core of the framework — how testers describe user actions, and how the framework validates outcomes.

### The Three-Layer Model

```
Simple English Description  →  Interactive CLI prompts
  ↓
AI Generation (LLM)         →  Generates Page Objects + Test Specs
  ↓
Page Object (CheckoutPage)  →  Abstracts locators & actions
  ↓
BasePage + SmartLocator     →  Heals broken selectors automatically
  ↓
Playwright Browser          →  Auto-waits, clicks, fills, asserts
```

---

### Step 1 — User Input (Typing, Clicking, Selecting)

Every user interaction is expressed using a Page Object method. The tester never writes raw selectors in test files — they call *business-language* methods.

#### Typing into a field

```javascript
// Page Object — defines the locator once
class LoginPage extends BasePage {
  emailInput    = this.page.getByLabel('Email Address');
  passwordInput = this.page.getByLabel('Password');
  loginBtn      = this.page.getByRole('button', { name: /login/i });

  async login(email, password) {
    await this.fill(this.emailInput,    email,    'Email Input');
    await this.fill(this.passwordInput, password, 'Password Input');
    await this.click(this.loginBtn, 'Login Button');
  }
}

// Test — reads like a user story
test('User logs in', async ({ page }) => {
  const login = new LoginPage(page);
  await login.navigate();
  await login.login('qa@store.com', 'SecurePass@123');
});
```

What `fill()` does under the hood:
1. **Waits** for the field to be visible and enabled (auto-wait)
2. **Clears** existing content
3. **Types** the value character by character
4. If the selector fails → **SmartLocator heals it automatically** (3 stages)

#### Clicking a button

```javascript
await this.click(this.addToCartBtn, 'Add to Cart Button');
// ↑ Playwright checks: visible? stable? enabled? not obscured? → THEN clicks.
// ↑ If selector is broken → SmartLocator kicks in before the test fails.
```

#### Selecting from a dropdown

```javascript
// Select by visible text
await this.page.selectOption('[data-testid="pincode-select"]', { label: '110001 - New Delhi' });

// Select by value
await this.page.selectOption('[data-testid="qty-select"]', '2');
```

#### Uploading a file

```javascript
await this.page.setInputFiles('[data-testid="prescription-upload"]', 'tests/fixtures/prescription.pdf');
```

#### Pressing keyboard keys

```javascript
await this.page.keyboard.press('Enter');
await this.page.keyboard.press('Tab');
await this.page.keyboard.type('Paracetamol 500mg'); // types naturally
```

---

### Step 2 — Assertions & Validation

Assertions are what make a test a *test* — they verify the application behaved correctly. This framework provides three layers of assertions.

#### Layer A — Playwright Native `expect()` — UI Assertions

These are the bread-and-butter assertions for UI tests. Playwright's `expect()` **auto-retries** for up to the configured timeout (default 5s), so transient loading states don't cause false failures.

```javascript
// ── Visibility ──────────────────────────────────────────────────
await expect(page.locator('[data-testid="success-banner"]')).toBeVisible();
await expect(page.locator('[data-testid="error-msg"]')).toBeHidden();

// ── Text content ─────────────────────────────────────────────────
await expect(page.locator('[data-testid="cart-count"]')).toHaveText('3');
await expect(page.locator('[data-testid="order-status"]')).toContainText('Confirmed');

// ── URL & navigation ─────────────────────────────────────────────
await expect(page).toHaveURL(/\/order-success/);
await expect(page).toHaveTitle('Order Confirmed — dWeb Store');

// ── Input values ──────────────────────────────────────────────────
await expect(page.locator('[data-testid="promo-input"]')).toHaveValue('SAVE10');

// ── Presence of an attribute ──────────────────────────────────────
await expect(page.locator('[data-testid="add-to-cart"]')).toBeEnabled();

// ── Count of matching elements ────────────────────────────────────
await expect(page.locator('.search-result-card')).toHaveCount(20);
```

> **Auto-retry explained**: `toHaveText('3')` does not fire once and fail. Playwright re-evaluates the locator every 100ms until the text matches OR the timeout expires. This eliminates the need for manual waits after cart updates, AJAX calls, or animations.

#### Layer B — API Response Assertions

Used in API tests and hybrid tests to validate the backend contract.

```javascript
// Status code
expect(response.status()).toBe(200);

// Exact field match
const body = await response.json();
expect(body.data.cartItemCount).toBe(1);
expect(body.data.items[0].skuId).toBe('SKU-123');

// Structural match (toMatchObject ignores extra fields)
expect(body).toMatchObject({
  success: true,
  data: { items: expect.any(Array) }
});

// Array length
expect(body.data.items).toHaveLength(1);

// Field presence
expect(body.data).toHaveProperty('orderId');

// Range check
expect(body.data.total).toBeGreaterThan(0);
```

#### Layer C — AssertionEngine — Rich DSL for API Flows

The `AssertionEngine` is a higher-level wrapper for advanced validation in multi-step API flows.

```javascript
const ae = new AssertionEngine(response);

// JSONPath — drill into nested responses
ae.assertJsonPath('$.data.items[0].name', 'Paracetamol 500mg');
ae.assertJsonPath('$.data.total', val => val > 0);

// JSON Schema validation (AJV)
ae.validateSchema({
  type: 'object',
  required: ['data', 'success'],
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      required: ['orderId', 'items']
    }
  }
});

// Response time SLA
ae.assertResponseTime(2000); // must respond within 2 seconds

// Header assertions
ae.assertHeader('Content-Type', 'application/json');
```

#### Layer D — Hybrid: UI action + API payload validation together

The most powerful pattern — assert what the UI *shows* AND what the UI *sends to the backend* in one test.

```javascript
test('Place order validates API payload and shows success', async ({ page }) => {
  const checkout = new CheckoutPage(page);
  await checkout.navigate();
  await checkout.addProductToCart();

  // Intercept the outgoing API call triggered by the UI button click
  const [orderRequest] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/api/v2/order/place')),
    checkout.clickPlaceOrder()
  ]);

  // ✅ Validate what the UI sent to the API
  const payload = orderRequest.postDataJSON();
  expect(payload.paymentMethod).toBe('cod');
  expect(payload.items).toHaveLength(1);
  expect(payload.items[0].skuId).toBe('SKU-123');

  // ✅ Validate what the UI shows the user
  await expect(page.locator('[data-testid="order-success"]')).toBeVisible();
  await expect(page.locator('[data-testid="order-id"]')).toContainText('ORD-');
});
```

---

### Step 3 — No-Code AI Generation (Simple English CLI)

For testers and BAs who prefer not to write code, the framework provides an **Interactive AI CLI**. You describe your test in simple English, and the AI generates the Page Objects and Playwright scripts automatically.

#### Step-by-Step Example: Login Flow

1. **Launch the Generator**:
   ```bash
   npm run generate:ui-test
   ```

2. **Describe the Test**:
   ```text
   💬 Describe your test: "Test login flow on the homepage. Enter 'user@example.com' in the email field, 'Password123' in the password field, click login, and verify the user is redirected to the dashboard."
   ```

3. **Choose Output Format**:
   Select `1` for **Playwright with Page Objects** (Recommended for reusability).

4. **Enable Self-Healing**:
   Select `Y` to wrap all generated interactions with **SmartLocator 3-stage healing**.

5. **Set Coverage Level**:
   Choose `comprehensive` to automatically generate **Negative Tests** (e.g., invalid email, wrong password) and **Edge Cases** alongside your happy path.

6. **Run Immediately**:
   The CLI will generate the files and ask: `▶️ Run the generated test now? (y/N)`. Select `y` to see it execute in the browser.

#### Generated Output (Automatic)

- **Page Object**: `pages/login-page.page.js` — Contains all locators and methods (`fillEmail`, `clickLogin`).
- **Test Spec**: `tests/ui/generated/login-flow.spec.js` — The executable test logic.
- **Self-Healing**: Every generated action is automatically protected by the AI healing engine.

---

### Comparison: Manual vs. AI-Generated

| Capability | Manual Coding | AI-Generated (Simple English) |
|---|---|---|
| **Authoring** | Minutes/Hours | Seconds |
| **Locators** | Manual inspection | AI-discovered & Registry-stored |
| **Maintenance** | Manual updates | AI Self-healing (Zero touch) |
| **Coverage** | Happy path focused | Comprehensive (Positive + Negative + Edge) |

---

## 🤖 AI-Powered Test Generation

Engineers don't need to write tests from scratch. The framework CLI uses LLMs (OpenAI GPT-4, Anthropic Claude, Groq Llama) to generate complete Playwright tests.

### Generate from a natural language description

```bash
npm run generate:ui-test
```

```
Describe the test:
"User logs in, searches for paracetamol, clicks the first result,
 adds it to the cart, and verifies the cart count badge shows 1."
```

**Output — ready-to-run files:**
- `tests/ui/generated/search-add-to-cart.spec.js` — Playwright spec  
- `tests/ui/generated/pages/home-page.page.js` — Page Object  
- `tests/ui/generated/pages/search-results-page.page.js` — Page Object  

### Generate API tests from a curl command

```bash
npm run generate:from-curl
```

Paste any curl from Postman or your API docs:

```bash
curl -X POST 'https://api.store.com/v2/cart/add' \
  -H 'Authorization: Bearer token' \
  -H 'Content-Type: application/json' \
  -d '{"skuId": "SKU-123", "qty": 1}'
```

The CLI parses the curl → converts to OpenAPI spec → generates `tests/api/cart-api.spec.js` with:
- Status code assertions
- Response schema validation
- Edge cases (400, 422, 401) auto-generated

### Configure an LLM Provider

```env
# In config/.env.stag — pick ONE:
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# OR OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# OR Anthropic Claude
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🛡️ SmartLocator — 3-Stage Self-Healing

In ecommerce, every UI deploy risks breaking locators: `data-testid` values change, button text is renamed, DOM structure shifts. SmartLocator intercepts these failures and automatically recovers — **without touching any test code**.

**Why no test code changes are needed:**

- **Interception happens inside `BasePage`, not in your test.** Every `click()` and `fill()` in the framework goes through `BasePage`, which wraps the action with SmartLocator. Your test spec calls `checkoutPage.clickAddToCart()` — it has no knowledge of selectors at all. SmartLocator sits transparently between your test and the browser.

- **Recovery is fully automatic across 3 stages.** When a selector fails, SmartLocator tries three progressively smarter recovery strategies (registry cache → fuzzy text match → LLM-inferred selector from live DOM) — all before throwing an error. Your test either passes with the healed selector, or fails with full diagnostic context. At no point does it pause and ask you to fix something.

- **Healed selectors are cached for all future runs.** Once a new selector is found, it is written to the component registry. The next time that same element is accessed — in any test, by any engineer — Stage 1 returns the cached fix instantly. The broken selector effectively "self-updates" across the test suite without anyone editing a single file.

### How it works

```
BasePage.click("Add to Cart") → selector times out at 3s
        │
        ├─ STAGE 1: Registry Cache
        │   "Was this element healed before?"
        │   Hit  → use cached selector instantly (zero latency)
        │   Miss → Stage 2
        │
        ├─ STAGE 2: Fuzzy Text Match
        │   Try: page.locator('text="Add to Cart"').first()
        │   Visible? → persist to Registry → return selector
        │   Not found → Stage 3
        │
        └─ STAGE 3: LLM Rescue (AI)
            Send: failed selector + error + full page DOM
            Receive: AI-inferred new CSS/attribute selector
            Validate: check visibility
            Success → persist to Registry → Stage 1 catches next time
            Failure → rethrow original error (test fails with full context)
```

### Key benefit for dWeb

When the frontend team ships a UI redesign, zero test maintenance is typically needed — SmartLocator heals on the first post-deploy run and caches the fix. Healing events are logged with full analytics.

```bash
npm run analyze:healing
# → reports/healing-analytics.json
# Shows: which elements healed, which stage, selector before/after, success rate
```

---

## 🌐 API Testing

### Native API tests — No extra library

Playwright's built-in `request` fixture shares the browser's auth session — no separate token management.

```javascript
test('Add item to cart — validates response contract', async ({ request }) => {
  const response = await request.post('/api/v2/cart/add', {
    data: { skuId: 'SKU-123', qty: 1, pincode: '110001' }
  });

  // Status code
  expect(response.status()).toBe(200);

  // Response body
  const body = await response.json();
  expect(body.data.cartItemCount).toBeGreaterThan(0);
  expect(body.data.items[0].skuId).toBe('SKU-123');
});

test('Out-of-stock item returns 422', async ({ request }) => {
  const response = await request.post('/api/v2/cart/add', {
    data: { skuId: 'OOS-SKU', qty: 1 }
  });
  expect(response.status()).toBe(422);
  expect((await response.json()).error.code).toBe('OUT_OF_STOCK');
});
```

### Multi-service API tests

The `MultiServiceApiClient` manages base URLs, auth, and headers per microservice — configured via `.env`.

```javascript
// One client, any service — configured in .env per environment
const catalog = getServiceClient('catalog');
const cart    = getServiceClient('cart');
const order   = getServiceClient('order');

const product = await catalog.get('/v1/products/search?q=paracetamol');
const added   = await cart.post('/v2/cart/add', { skuId: product.data[0].id });
const placed  = await order.post('/v2/orders/place', { cartId: added.cartId });

expect(placed.status).toBe('CONFIRMED');
```

### Variable chaining across API steps

```javascript
// Step 1 → extract and store a value
const searchResp = await request.get('/api/v1/search?q=paracetamol');
vm.set('productId', searchResp.json().data.products[0].id);

// Step 2 → use it in the next call (no hardcoding)
const cartResp = await request.post('/api/v2/cart/add', {
  data: { skuId: vm.get('productId'), qty: 1 }
});
```

---

## 📊 Reporting & Observability

### Five concurrent reporters — zero extra setup

| Report | What it shows | Command |
|---|---|---|
| **HTML Report** | Step-by-step with screenshots, request/response | `npm run report` |
| **Allure Dashboard** | Test trends, failure history, retry analysis | `npm run report:allure` |
| **JUnit XML** | CI gate (GitLab / Jenkins / GitHub Actions) | auto-generated |
| **Healing Analytics** | Which elements healed, which stage, selector before/after | `npm run analyze:healing` |
| **Trace Viewer** | DOM + network + console at every step — time-travel debugger | `npx playwright show-trace trace.zip` |

### Trace Viewer on CI failure

When any test fails in CI, a `trace.zip` is attached automatically. Open it locally:

```bash
npx playwright show-trace test-results/*/trace.zip
```

You see: the DOM state at every step, every network request and response, console errors, screenshots — everything needed to reproduce and fix the issue in minutes, not hours.

---

## 🐳 CI/CD & Docker

### GitLab CI Pipeline (`.gitlab-ci.yml`)

```yaml
stages:
  - lint       # ESLint + Prettier
  - install    # npm ci + browser install
  - test       # playwright test (4 parallel workers)
  - report     # Allure generate + publish
```

### Running in CI

```bash
# 4 parallel workers, video + trace on failure, JUnit output
TEST_ENV=stag npx playwright test --workers=4
```

### Docker

```bash
docker build -t playwright-automation .
docker-compose up --exit-code-from playwright
```

### Multi-environment

```bash
TEST_ENV=stag npm test   # Staging
TEST_ENV=prod npm test   # Production
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 18, npm ≥ 9

### Installation

```bash
git clone <repo-url>
cd Playwright-Automation
npm install
npm run install:browsers
```

### Environment Setup

```bash
cp .env.example config/.env.stag
# Edit: BASE_URL, API_BASE_URL, test credentials, LLM API key
```

### Run Tests

```bash
npm test                    # All tests, all browsers (parallel)
npm run test:chrome         # Chrome only
npm run test:api            # API tests only
npm run ui                  # Playwright interactive UI mode
npm run test:headed         # Watch the browser live
npm run test:debug          # Step-by-step debugger
npm run generate:ui-test    # Generate test from simple English description
npm run generate:from-curl  # Generate API test from curl command
```

---

## 📋 Feature Matrix

| Feature | Description | Status |
|---|---|---|
| **UI Automation** | Page Object Model, auto-wait, self-healing | ✅ |
| **API Automation** | Native `request` + multi-service HTTP client | ✅ |
| **Hybrid Tests** | UI + API + DB assertions in one spec | ✅ |
| **SmartLocator** | 3-stage: Registry → Fuzzy → LLM rescue | ✅ |
| **AI Test Generation** | Spec + POM from natural language | ✅ |
| **Curl → API Tests** | LLM converts curl to Playwright spec | ✅ |
| **OpenAPI → Tests** | Spec-driven API test generation | ✅ |
| **AI Generation** | Simple English CLI — generates Page Objects + Test Specs | ✅ |
| **Cross-Browser** | Chrome, Firefox, Safari, Edge | ✅ |
| **Mobile Web** | Pixel 5, iPhone 13, 100+ presets | ✅ |
| **Parallelism** | `fullyParallel: true`, 4 CI workers | ✅ |
| **Auth Injection** | Pre-authenticated state per test | ✅ |
| **Network Interception** | Mock/assert API calls from the UI | ✅ |
| **Variable Chaining** | JSONPath extraction → next step input | ✅ |
| **Schema Validation** | AJV JSON Schema in API assertions | ✅ |
| **Visual Testing** | Screenshot comparison with threshold | ✅ |
| **DB Assertions** | PostgreSQL + MongoDB queries in tests | ✅ |
| **Allure Reports** | Rich test history + trend charts | ✅ |
| **Healing Analytics** | Per-element heal stage diagnostics | ✅ |
| **Trace Viewer** | Video + DOM snapshots on CI failure | ✅ |
| **JUnit XML** | CI gate integration | ✅ |
| **GitLab CI** | Pipeline: lint → install → test → report | ✅ |
| **Docker** | Containerised execution | ✅ |
| **Multi-env** | `TEST_ENV=prod\|stag\|dev` selector | ✅ |

---

> **Framework version**: 1.0.0 | **Playwright**: ^1.40.0 | **Node**: ≥18  
> **Maintained by**: dWeb QA Platform Team
