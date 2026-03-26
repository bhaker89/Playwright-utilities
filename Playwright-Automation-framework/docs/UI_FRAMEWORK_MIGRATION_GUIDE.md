# UI Framework Migration Guide
## From utils/ui-actions.js → Bridge Pattern (10xquality-inspired, No BDD)

---

## 🎯 **What Changed?**

### **Before (Old Pattern)**
```javascript
const { test, expect } = require('../fixtures/base-test');
const { clickByText, fillByPlaceholder } = require('../utils/ui/ui-actions');
const { LoginPage } = require('../pages/login.page');

test('login test', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await page.getByRole('textbox').fill('9876543210');
  await clickByText(page, 'SEND OTP');
  // ...manual locator management, no self-healing...
});
```

### **After (New Pattern)**
```javascript
const { test, expect } = require('../fixtures/base-test');

test('login test', async ({ bridge }) => {
  // Everything through Bridge - single entry point
  await bridge.loginPage.navigate();
  await bridge.loginPage.loginWithOTP('9876543210', '123456');
  await bridge.assert.toHaveURL(/\/dashboard/);
  // ✅ Self-healing built-in
  // ✅ Consistent logging
  // ✅ Singleton pattern
});
```

---

## 🏗️ **Architecture Overview**

```
Test File
    ↓
  Bridge (single entry point)
    ├── wrapper (PlaywrightWrapper) - UI actions
    ├── assert (AssertWrapper) - Assertions
    ├── context (SharedTestContext) - Data sharing
    ├── apiClient (APIClient) - For hybrid tests
    └── pages
        ├── loginPage (LoginPage)
        ├── homePage (HomePage)
        └── ...your pages...
           ↓
      SmartLocator (3-stage self-healing)
           ↓
      Playwright Page (with storageState)
```

---

## 📦 **New Components**

### 1. **PlaywrightWrapper** (`utils/ui/playwright-wrapper.js`)
**Purpose:** Singleton wrapper for all UI actions with built-in self-healing

**Key Methods:**
- `goto(url)` - Navigate
- `click(selector, name)` - Click with healing
- `fill(selector, value, name)` - Fill with healing
- `clickByText(text)` - Click by text
- `clickByRole(role, options)` - Accessibility-first
- `selectDropdownOption(trigger, option)` - Custom dropdowns
- `waitForText(text)` - Wait helpers
- `dismissIfPresent(selector)` - Conditional actions

**Example:**
```javascript
const wrapper = bridge.wrapper;
await wrapper.goto('https://example.com');
await wrapper.fill('.email', 'test@example.com', 'Email Input');
await wrapper.clickByRole('button', { name: /submit/i });
```

### 2. **AssertWrapper** (`utils/ui/assert-wrapper.js`)
**Purpose:** Consistent assertions with logging

**Key Methods:**
- `toBeVisible(selector, name)` - Element visible
- `toHaveText(selector, text, name)` - Text match
- `toHaveURL(pattern)` - URL assertion
- `toBeEnabled(selector, name)` - Element enabled
- `toHaveCount(selector, count)` - Count assertion
- `toastVisible(message)` - Toast/notification check

**Example:**
```javascript
await bridge.assert.toBeVisible('.logo', 'Site Logo');
await bridge.assert.toHaveURL(/\/dashboard/);
await bridge.assert.toastVisible('Login successful');
```

### 3. **Bridge** (`utils/ui/bridge.js`)
**Purpose:** Single entry point to all pages, wrappers, and helpers

**Properties:**
- `bridge.page` - Raw Playwright Page
- `bridge.wrapper` - PlaywrightWrapper instance
- `bridge.assert` - AssertWrapper instance
- `bridge.context` - SharedTestContext
- `bridge.apiClient` - API client (for hybrid tests)
- `bridge.loginPage` - LoginPage instance
- `bridge.yourPage` - Add your pages here

**How to add new pages:**
```javascript
// 1. Import at top of bridge.js
const { CheckoutPage } = require('../pages/checkout.page');

// 2. Add in constructor
this.checkoutPage = CheckoutPage.getInstance(page);
```

### 4. **Updated BasePage**
**Now includes:**
- `this.wrapper` - PlaywrightWrapper instance
- `this.assert` - AssertWrapper instance
- `this.healer` - SmartLocator (self-healing)
- Singleton pattern support

---

## 🚀 **Migration Steps**

### Step 1: Use Bridge in your tests
**Old:**
```javascript
test('example', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
});
```

**New:**
```javascript
test('example', async ({ bridge }) => {
  await bridge.loginPage.navigate();
});
```

### Step 2: Replace direct locator calls with wrapper
**Old:**
```javascript
await page.locator('.button').click();
await page.locator('.input').fill('value');
```

**New:**
```javascript
await bridge.wrapper.click('.button', 'Submit Button');
await bridge.wrapper.fill('.input', 'value', 'Input Field');
```

### Step 3: Use assert wrapper for assertions
**Old:**
```javascript
await expect(page.locator('.message')).toBeVisible();
```

**New:**
```javascript
await bridge.assert.toBeVisible('.message', 'Success Message');
```

### Step 4: Update Page Objects to singleton pattern
**Old:**
```javascript
class HomePage extends BasePage {
  constructor(page) {
    super(page);
  }
}
module.exports = { HomePage };
```

**New:**
```javascript
class HomePage extends BasePage {
  static _instance = null;
  static _currentPage = null;

  constructor(page) {
    super(page);
  }

  static getInstance(page) {
    if (!HomePage._instance || HomePage._currentPage !== page) {
      HomePage._instance = new HomePage(page);
      HomePage._currentPage = page;
    }
    return HomePage._instance;
  }
}
module.exports = { HomePage };
```

### Step 5: Register new pages in Bridge
```javascript
// utils/ui/bridge.js

// 1. Import
const { HomePage } = require('../pages/home.page');

// 2. Add to constructor
constructor(page, apiClient = null) {
  // ...existing code...
  this.homePage = HomePage.getInstance(page);
}
```

---

## ✅ **Benefits of New Pattern**

### 1. **Self-Healing Built-In**
Every action automatically goes through SmartLocator:
- Stage 1: Component Registry (cached fixes)
- Stage 2: Fuzzy DOM matching
- Stage 3: LLM-powered rescue

### 2. **Consistent Logging**
Every action/assertion logs to console + reports:
```
[Wrapper] 🖱️  Click: Submit Button
[Assert] ✅ "Success Message" is visible
```

### 3. **No Import Chaos**
```javascript
// Before
const { clickByText, fillInput, waitForElement } = require('...');
const { LoginPage } = require('...');
const { HomePage } = require('...');
const { APIClient } = require('...');

// After
const { test } = require('../fixtures/base-test');
// Everything through bridge!
```

### 4. **UI + API Integration (storageState)**
```javascript
test('hybrid test', async ({ bridge }) => {
  // API (authenticated via storageState)
  const user = await bridge.apiClient.get('/user/profile');
  
  // UI (authenticated via storageState)
  await bridge.goto(`/profile/${user.body.id}`);
  await bridge.assert.toBeVisible('.profile-name');
});
```

### 5. **Singleton = No Duplication**
```javascript
// Multiple calls return same instance (efficient)
const bridge1 = Bridge.getInstance(page);
const bridge2 = Bridge.getInstance(page);
// bridge1 === bridge2 ✅
```

---

## 🔧 **Configuration**

### Auth Setup (Shared Session)
Your `tests/setup/auth.setup.js` now supports:

**Environment Variables:**
```bash
# Force fresh auth (ignore cache)
FORCE_AUTH=true

# Set auth TTL (default: 720 minutes = 12 hours)
AUTH_TTL_MINUTES=360

# Use API-based auth (faster than UI)
USE_API_AUTH=true

# Test credentials
TEST_MOBILE=9876543210
TEST_OTP=123456
```

**How it works:**
1. Setup runs once before all tests
2. Generates `.auth/user.json` (shared session)
3. All UI projects load this storageState
4. API client also uses it (authenticated requests)
5. One user for whole suite (fast, consistent)

---

## 📊 **Healing Analytics**

Self-healing events are tracked in `reports/healing-analytics.json`:

```json
{
  "testName": "login test",
  "pageName": "LoginPage",
  "elementName": "Submit Button",
  "originalSelector": "button.old-class",
  "stage": 2,
  "success": true,
  "newSelector": "text=\"Submit\"",
  "duration": 250,
  "error": "Timeout 5000ms exceeded"
}
```

Use this to:
- Identify flaky selectors
- See healing success rates
- Update page objects with better selectors

---

## 🧪 **Example Test**

See `tests/examples/ui-bridge-pattern.spec.js` for full examples including:
- Simple navigation
- Login with self-healing
- Dropdown interactions
- UI + API hybrid tests
- Conditional actions
- Multiple assertions

---

## 🚨 **Important Notes**

### ✅ **DO:**
- Use `bridge` fixture in all new UI tests
- Add logical `elementName` to wrapper calls (for healing)
- Register new pages in Bridge
- Use singleton pattern for page objects
- Let storageState handle auth (don't re-login in tests)

### ❌ **DON'T:**
- Call `new LoginPage(page)` directly (use `bridge.loginPage`)
- Mix old pattern with new pattern in same test
- Create page/context manually (breaks storageState)
- Skip element names in wrapper calls (hurts healing accuracy)

---

## 🎓 **Training Examples**

### Pattern Comparison

| Task | Old Pattern | New Pattern |
|------|-------------|-------------|
| Click button | `await page.locator('.btn').click()` | `await bridge.wrapper.click('.btn', 'Submit')` |
| Fill input | `await page.fill('.input', 'val')` | `await bridge.wrapper.fill('.input', 'val', 'Email')` |
| Assert visible | `await expect(page.locator('.msg')).toBeVisible()` | `await bridge.assert.toBeVisible('.msg', 'Message')` |
| Navigate | `await page.goto('url')` | `await bridge.goto('url')` |
| Page object | `const login = new LoginPage(page)` | `bridge.loginPage` |
| API call | `await apiClient.get('/api')` | `await bridge.apiClient.get('/api')` |

---

## 📚 **Further Reading**

- `utils/ui/playwright-wrapper.js` - All wrapper methods
- `utils/ui/assert-wrapper.js` - All assertion methods
- `utils/ui/bridge.js` - Bridge implementation
- `platform/core/smart-locator.js` - Self-healing engine
- `tests/examples/ui-bridge-pattern.spec.js` - Complete examples

---

## 🤝 **Support**

Questions? Check:
1. Example test file (`tests/examples/ui-bridge-pattern.spec.js`)
2. Healing analytics (`reports/healing-analytics.json`)
3. Logs (all actions are logged)

---

**Happy Testing! 🚀**