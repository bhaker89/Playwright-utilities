# Helper Methods Reorganization Guide

## 📁 New Structure

The framework helper methods have been reorganized into a cleaner, more maintainable structure:

```
utils/
├── ui/
│   ├── index.js              # Central export
│   └── ui-actions.js         # All UI-related helpers
├── network/
│   ├── index.js              # Central export
│   └── network-actions.js    # All network-related helpers
└── base/
    └── test-helpers.js       # Backward compatibility layer (re-exports)

pages/
└── base.page.js              # THIN - only core navigation & locators
```

## 🎯 Design Principles

1. **Thin BasePage**: Only core page navigation and locator methods
2. **Separation of Concerns**: UI actions separate from network utilities
3. **Framework-wide Utilities**: Import helpers directly in tests, not through BasePage
4. **Backward Compatibility**: Existing tests continue to work without changes
5. **Easy Imports**: Use index files for cleaner imports

## 📚 Complete Helper API Reference

### A) UI Actions (`utils/ui/ui-actions.js`)

Import these directly in your tests or page objects:

```javascript
const { 
  clickAndWaitForPopup, 
  downloadAfterClick, 
  uploadFile, 
  expectToast,
  withinFrame,
  grantPermissions,
  waitForNetworkIdleSafe
} = require('../utils/ui');
```

#### 🪟 Popup / New Tab Handling

**`clickAndWaitForPopup(page, clickFnOrLocator)`**
- Clicks element and waits for popup/new tab to open
- Returns new Page object for interaction

**Example**:
```javascript
const { clickAndWaitForPopup } = require('../utils/ui');

test('open help in new tab', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Using a locator
  const popup = await clickAndWaitForPopup(page, page.locator('.open-help'));
  await expect(popup.locator('h1')).toContainText('Help');
  await popup.close();
  
  // Using a function
  const popup2 = await clickAndWaitForPopup(page, async () => {
    await page.click('.open-terms');
  });
  await popup2.close();
});
```

#### 📥 Download Handling

**`downloadAfterClick(page, locator, options)`**
- Triggers download and returns download info
- Options: `{ saveAsDir: 'path/to/dir' }`
- Returns: `{ download, path, filename }`

**Example**:
```javascript
const { downloadAfterClick } = require('../utils/ui');

test('download report', async ({ page }) => {
  await page.goto('/reports');
  
  const result = await downloadAfterClick(page, page.locator('#download-btn'), {
    saveAsDir: 'test-results/downloads'
  });
  
  console.log('Downloaded to:', result.path);
  expect(result.filename).toBe('report.pdf');
  expect(fs.existsSync(result.path)).toBe(true);
});
```

#### 📤 File Upload

**`uploadFile(page, inputLocator, filePath)`**
- Uploads file to input element
- Accepts relative or absolute paths
- Validates file exists before upload

**Example**:
```javascript
const { uploadFile, expectToast } = require('../utils/ui');

test('upload document', async ({ page }) => {
  await page.goto('/upload');
  
  await uploadFile(page, '#file-input', './test-data/sample.pdf');
  
  await expectToast(page, 'File uploaded successfully', {
    timeout: 5000,
    disappear: true
  });
  
  await expect(page.locator('.uploaded-file')).toContainText('sample.pdf');
});
```

#### 🍞 Toast / Notification

**`expectToast(page, message, options)`**
- Waits for and verifies toast/notification message
- Options: `{ testId, selector, timeout, disappear }`

**Example**:
```javascript
const { expectToast } = require('../utils/ui');

// Basic usage
await expectToast(page, 'Login successful');

// With test ID
await expectToast(page, /saved/i, { 
  testId: 'toast-message', 
  timeout: 3000 
});

// Wait for disappearance
await expectToast(page, 'Copied!', { disappear: true });
```

#### 🖼️ Iframe Handling

**`withinFrame(page, frameSelector, fn)`**
- Executes actions within iframe context
- Returns result of the function

**Example**:
```javascript
const { withinFrame } = require('../utils/ui');

test('fill payment form in iframe', async ({ page }) => {
  await page.goto('/checkout');
  
  await withinFrame(page, '#payment-iframe', async (frame) => {
    await frame.locator('#card-number').fill('4242424242424242');
    await frame.locator('#expiry').fill('12/25');
    await frame.locator('#cvv').fill('123');
    await frame.locator('#submit-payment').click();
  });
  
  await expect(page.locator('.success-message')).toBeVisible();
});
```

#### 🔐 Permissions

**`grantPermissions(page, permissions, origin?)`**
- Grants browser permissions
- Permissions: `['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'clipboard-write']`

**Example**:
```javascript
const { grantPermissions } = require('../utils/ui');

test('test geolocation feature', async ({ page }) => {
  await grantPermissions(page, ['geolocation']);
  
  await page.goto('/find-stores');
  await page.click('#use-my-location');
  
  await expect(page.locator('.nearby-stores')).toBeVisible();
});
```

#### 🌐 Network & Page Load

**`waitForPageLoad(page, timeout?)`**
- Waits for networkidle state
- Default timeout: 30000ms

**`waitForNetworkIdleSafe(page, timeout?)`**
- Safe wrapper with error handling
- Continues even if network doesn't settle

**Example**:
```javascript
const { waitForNetworkIdleSafe } = require('../utils/ui');

test('load dynamic content', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('#load-widgets');
  
  // Won't fail even if network doesn't completely settle
  await waitForNetworkIdleSafe(page, 5000);
  
  await expect(page.locator('.widget')).toHaveCount(5);
});
```

#### 📸 Screenshots & Elements

**`takeScreenshot(page, name, fullPage?)`**
- Captures screenshot with timestamp
- Saves to `test-results/screenshots/`

**`waitForElement(page, selector, timeout?)`**
- Waits for element to be visible and enabled

**`scrollToElement(page, selector)`**
- Scrolls element into view

**Example**:
```javascript
const { waitForElement, scrollToElement, takeScreenshot } = require('../utils/ui');

test('interact with element', async ({ page }) => {
  await page.goto('/long-page');
  
  await scrollToElement(page, '#footer-section');
  await waitForElement(page, '#subscribe-btn', 5000);
  
  await takeScreenshot(page, 'before-click', true);
  await page.click('#subscribe-btn');
});
```

#### 🛠️ Utilities

**`generateRandomString(length?)`**
**`generateRandomEmail()`**
**`generateRandomPhone()`**
**`wait(ms)`**
**`retry(fn, maxAttempts?, delay?)`**

**Example**:
```javascript
const { generateRandomEmail, retry } = require('../utils/ui');

test('create user with retry', async ({ page, apiClient }) => {
  const email = generateRandomEmail();
  
  const user = await retry(async () => {
    return await apiClient.post('/users', { email });
  }, 3, 1000);
  
  expect(user.body).toHaveProperty('id');
});
```

---

### B) Network Actions (`utils/network/network-actions.js`)

Import these directly for network-related operations:

```javascript
const { 
  waitForApiResponse, 
  captureJsonResponse,
  mockApi,
  mockApiError,
  validateBrokenLinks,
  monitorNetworkActivity
} = require('../utils/network');
```

#### 🔄 API Response Waiting & Capture

**`waitForApiResponse(page, options)`**
- Waits for specific API response
- Options: `{ urlContains, method, status, timeout }`
- Returns Response object

**Example**:
```javascript
const { waitForApiResponse } = require('../utils/network');

test('verify API call on button click', async ({ page }) => {
  await page.goto('/dashboard');
  
  const responsePromise = waitForApiResponse(page, {
    urlContains: '/api/users',
    method: 'POST',
    status: 201,
    timeout: 30000
  });
  
  await page.click('#create-user');
  
  const response = await responsePromise;
  const body = await response.json();
  
  expect(body).toHaveProperty('id');
  expect(body.email).toContain('@');
});
```

**`captureJsonResponse(page, predicate, timeout?)`**
- Captures and returns parsed JSON response

**Example**:
```javascript
const { captureJsonResponse } = require('../utils/network');

test('capture user ID from response', async ({ page }) => {
  await page.goto('/signup');
  
  const capturePromise = captureJsonResponse(page, (response) => {
    return response.url().includes('/api/users') && 
           response.request().method() === 'POST';
  });
  
  await page.fill('#email', 'test@example.com');
  await page.click('#signup-btn');
  
  const userData = await capturePromise;
  console.log('Created user ID:', userData.id);
  
  // Use captured data for next step
  await page.goto(`/users/${userData.id}`);
});
```

#### 🎭 API Mocking

**`mockApi(page, urlPattern, handler, options?)`**
- Mocks API endpoint with custom response
- Returns disposer function
- Options: `{ status, headers, delay }`

**Example**:
```javascript
const { mockApi } = require('../utils/network');

test('test with mocked user data', async ({ page }) => {
  // Mock user profile API
  const unmock = await mockApi(page, '**/api/user/profile', {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    premium: true
  });
  
  await page.goto('/profile');
  
  await expect(page.locator('.user-name')).toContainText('Test User');
  await expect(page.locator('.premium-badge')).toBeVisible();
  
  await unmock(); // Clean up mock
});

test('mock with dynamic handler', async ({ page }) => {
  // Mock returns different data based on request
  const unmock = await mockApi(page, '**/api/users/*', (route, request) => {
    const userId = request.url().split('/').pop();
    return { 
      id: userId, 
      name: `User ${userId}`,
      status: 'active'
    };
  }, { status: 200, delay: 500 });
  
  await page.goto('/users/123');
  await expect(page.locator('.user-name')).toContainText('User 123');
  
  await unmock();
});
```

**`mockApiError(page, urlPattern, statusCode?, errorMessage?)`**
- Mocks API to fail with specific error

**Example**:
```javascript
const { mockApiError } = require('../utils/network');

test('handle API error gracefully', async ({ page }) => {
  const unmock = await mockApiError(page, '**/api/users', 503, 'Service Unavailable');
  
  await page.goto('/users');
  await page.click('#load-users');
  
  await expect(page.locator('.error-message')).toContainText('Service Unavailable');
  await expect(page.locator('.retry-button')).toBeVisible();
  
  await unmock();
});
```

#### 🔗 Link Validation

**`validateBrokenLinks(page, requestContext, options?)`**
- Validates all links on page
- Options: `{ ignorePatterns, checkExternal, timeout }`
- Returns array of broken links

**Example**:
```javascript
const { validateBrokenLinks } = require('../utils/network');

test('check for broken links on homepage', async ({ page, request }) => {
  await page.goto('/');
  
  const brokenLinks = await validateBrokenLinks(page, request, {
    ignorePatterns: ['mailto:', 'tel:', '#', 'javascript:'],
    checkExternal: false, // Only check internal links
    timeout: 5000
  });
  
  expect(brokenLinks, `Found broken links: ${JSON.stringify(brokenLinks)}`).toHaveLength(0);
  
  if (brokenLinks.length > 0) {
    console.log('Broken links found:');
    brokenLinks.forEach(link => {
      console.log(`  - ${link.url} [${link.status}]`);
    });
  }
});
```

#### 📊 Network Monitoring

**`monitorNetworkActivity(page, actionFn)`**
- Monitors all network requests during action
- Returns array of request data with method, URL, status, duration

**Example**:
```javascript
const { monitorNetworkActivity } = require('../utils/network');

test('analyze network performance', async ({ page }) => {
  await page.goto('/dashboard');
  
  const requests = await monitorNetworkActivity(page, async () => {
    await page.click('#load-data');
    await page.waitForSelector('.data-loaded');
  });
  
  console.log(`Total requests: ${requests.length}`);
  
  const apiCalls = requests.filter(r => r.url.includes('/api/'));
  console.log(`API calls: ${apiCalls.length}`);
  
  const slowRequests = requests.filter(r => r.duration > 1000);
  if (slowRequests.length > 0) {
    console.log('Slow requests (>1s):');
    slowRequests.forEach(r => {
      console.log(`  - ${r.method} ${r.url} (${r.duration}ms)`);
    });
  }
  
  // Assert performance expectations
  expect(apiCalls.length).toBeLessThan(10); // Should not make too many calls
  expect(slowRequests.length).toBe(0); // No slow requests
});
```

---

## 🏗️ Usage in Page Objects

Since BasePage is kept thin, import UI/network actions directly:

```javascript
const { BasePage } = require('./base.page');
const { uploadFile, expectToast, clickAndWaitForPopup } = require('../utils/ui');
const { waitForApiResponse } = require('../utils/network');

class DocumentPage extends BasePage {
  constructor(page) {
    super(page);
    this.pageUrl = '/documents';
    
    // Define locators
    this.uploadInput = this.getByTestId('file-upload');
    this.downloadBtn = this.getByRole('button', { name: 'Download' });
    this.helpLink = this.getByText('Help');
  }
  
  async uploadDocument(filePath) {
    // Use UI action directly
    await uploadFile(this.page, this.uploadInput, filePath);
    await expectToast(this.page, 'Document uploaded successfully');
  }
  
  async openHelp() {
    // Use UI action for popup
    return await clickAndWaitForPopup(this.page, this.helpLink);
  }
  
  async createDocumentAndWaitForResponse(docData) {
    // Use network action to capture API response
    const responsePromise = waitForApiResponse(this.page, {
      urlContains: '/api/documents',
      method: 'POST',
      status: 201
    });
    
    await this.getByRole('button', { name: 'Create' }).click();
    
    const response = await responsePromise;
    return await response.json();
  }
}

module.exports = { DocumentPage };
```

---

## 🔄 Migration Guide

### ✅ For NEW Tests

Import helpers directly:

```javascript
const { test, expect } = require('../fixtures/base-test');
const { uploadFile, expectToast, clickAndWaitForPopup } = require('../utils/ui');
const { mockApi, waitForApiResponse } = require('../utils/network');

test('comprehensive test', async ({ page }) => {
  // Use UI actions
  await page.goto('/app');
  await uploadFile(page, '#file-input', './test-data/doc.pdf');
  await expectToast(page, 'Success!');
  
  // Use network actions
  const responsePromise = waitForApiResponse(page, {
    urlContains: '/api/process',
    status: 200
  });
  
  await page.click('#process-btn');
  const response = await responsePromise;
  
  expect(response.status()).toBe(200);
});
```

### ✅ For EXISTING Tests

No changes needed - backward compatibility maintained:

```javascript
// This still works!
const { waitForPageLoad, takeScreenshot } = require('../utils/test-helpers');
```

### ✅ In Page Objects

Keep them thin, import utilities:

```javascript
const { BasePage } = require('./base.page');
const { uploadFile, expectToast } = require('../utils/ui');

class MyPage extends BasePage {
  async doSomething() {
    // Use utilities directly with this.page
    await uploadFile(this.page, this.fileInput, './file.pdf');
    await expectToast(this.page, 'Done!');
  }
}
```

---

## 🧪 Complete Test Examples

### Example 1: Multi-tab Workflow
```javascript
const { test, expect } = require('../fixtures/base-test');
const { clickAndWaitForPopup } = require('../utils/ui');

test('open documentation in new tab', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Open help in new tab
  const docsPage = await clickAndWaitForPopup(page, page.locator('#docs-link'));
  
  // Verify docs page
  await expect(docsPage.locator('h1')).toContainText('Documentation');
  await expect(docsPage.locator('.search-box')).toBeVisible();
  
  // Original page should still be active
  await expect(page.locator('.dashboard-title')).toBeVisible();
  
  // Close docs tab
  await docsPage.close();
});
```

### Example 2: Download + Upload Flow
```javascript
const { test, expect } = require('../fixtures/base-test');
const { downloadAfterClick, uploadFile, expectToast } = require('../utils/ui');
const fs = require('fs');

test('download template and upload filled', async ({ page }) => {
  await page.goto('/forms');
  
  // Download template
  const download = await downloadAfterClick(page, page.locator('#download-template'));
  expect(download.filename).toBe('template.xlsx');
  expect(fs.existsSync(download.path)).toBe(true);
  
  // Simulate filling template (in real scenario, you'd process the file)
  // ...
  
  // Upload filled template
  await uploadFile(page, '#upload-filled', download.path);
  
  await expectToast(page, 'File uploaded successfully', {
    timeout: 5000,
    disappear: true
  });
  
  await expect(page.locator('.uploaded-files')).toContainText('template.xlsx');
});
```

### Example 3: API Mocking for Isolated Testing
```javascript
const { test, expect } = require('../fixtures/base-test');
const { mockApi } = require('../utils/network');

test('display premium features for premium users', async ({ page }) => {
  // Mock user API to return premium user
  const unmock = await mockApi(page, '**/api/user/profile', {
    id: 1,
    name: 'Premium User',
    email: 'premium@example.com',
    tier: 'premium',
    features: ['advanced-analytics', 'priority-support', 'custom-themes']
  }, { status: 200 });
  
  await page.goto('/dashboard');
  
  // Verify premium features are visible
  await expect(page.locator('.premium-badge')).toBeVisible();
  await expect(page.locator('[data-feature="advanced-analytics"]')).toBeVisible();
  await expect(page.locator('[data-feature="priority-support"]')).toBeVisible();
  
  await unmock();
});
```

### Example 4: Network Response Capture
```javascript
const { test, expect } = require('../fixtures/base-test');
const { captureJsonResponse } = require('../utils/network');

test('create order and verify response', async ({ page }) => {
  await page.goto('/shop');
  
  // Set up response capture
  const orderPromise = captureJsonResponse(page, (response) => {
    return response.url().includes('/api/orders') && 
           response.request().method() === 'POST' &&
           response.status() === 201;
  });
  
  // Trigger order creation
  await page.click('#add-to-cart');
  await page.click('#checkout');
  await page.fill('#card-number', '4242424242424242');
  await page.click('#place-order');
  
  // Get and verify order data
  const orderData = await orderPromise;
  
  expect(orderData).toHaveProperty('orderId');
  expect(orderData).toHaveProperty('total');
  expect(orderData.status).toBe('confirmed');
  
  console.log('Order created:', orderData.orderId);
  
  // Use captured data for verification
  await page.goto(`/orders/${orderData.orderId}`);
  await expect(page.locator('.order-status')).toContainText('confirmed');
});
```

### Example 5: Iframe Payment Form
```javascript
const { test, expect } = require('../fixtures/base-test');
const { withinFrame } = require('../utils/ui');

test('complete payment in iframe', async ({ page }) => {
  await page.goto('/checkout');
  
  // Fill shipping info
  await page.fill('#shipping-address', '123 Main St');
  await page.click('#continue-to-payment');
  
  // Handle payment iframe
  await withinFrame(page, '#stripe-payment-iframe', async (frame) => {
    await frame.locator('#card-number').fill('4242424242424242');
    await frame.locator('#card-expiry').fill('12/25');
    await frame.locator('#card-cvc').fill('123');
  });
  
  // Submit payment (outside iframe)
  await page.click('#submit-payment');
  
  await expect(page.locator('.payment-success')).toBeVisible();
});
```

### Example 6: Link Validation
```javascript
const { test, expect } = require('../fixtures/base-test');
const { validateBrokenLinks } = require('../utils/network');

test.describe('Link validation', () => {
  test('homepage should have no broken links', async ({ page, request }) => {
    await page.goto('/');
    
    const brokenLinks = await validateBrokenLinks(page, request, {
      ignorePatterns: ['mailto:', 'tel:', '#'],
      checkExternal: false,
      timeout: 5000
    });
    
    expect(brokenLinks).toHaveLength(0);
  });
  
  test('documentation should have no broken links', async ({ page, request }) => {
    await page.goto('/docs');
    
    const brokenLinks = await validateBrokenLinks(page, request, {
      ignorePatterns: ['mailto:', 'tel:', '#', 'javascript:'],
      checkExternal: true, // Check external links too
      timeout: 10000
    });
    
    if (brokenLinks.length > 0) {
      console.log('Broken links found:');
      brokenLinks.forEach(link => {
        console.log(`  ${link.status} - ${link.url}`);
      });
    }
    
    expect(brokenLinks).toHaveLength(0);
  });
});
```

### Example 7: Performance Monitoring
```javascript
const { test, expect } = require('../fixtures/base-test');
const { monitorNetworkActivity } = require('../utils/network');

test('dashboard loads efficiently', async ({ page }) => {
  await page.goto('/dashboard');
  
  const requests = await monitorNetworkActivity(page, async () => {
    await page.click('#load-widgets');
    await page.waitForSelector('.widgets-loaded');
  });
  
  console.log(`Total requests: ${requests.length}`);
  
  // Analyze requests
  const apiCalls = requests.filter(r => r.url.includes('/api/'));
  const slowRequests = requests.filter(r => r.duration > 1000);
  const failedRequests = requests.filter(r => r.status >= 400);
  
  // Assertions
  expect(apiCalls.length, 'Too many API calls').toBeLessThanOrEqual(5);
  expect(slowRequests.length, 'Slow requests detected').toBe(0);
  expect(failedRequests.length, 'Failed requests detected').toBe(0);
  
  // Log detailed info
  if (slowRequests.length > 0) {
    console.log('Slow requests (>1s):');
    slowRequests.forEach(r => {
      console.log(`  ${r.method} ${r.url} - ${r.duration}ms`);
    });
  }
});
```

---

## 📋 Summary

### What Changed:
✅ **New organized structure**: `utils/ui/` and `utils/network/`  
✅ **All existing helpers** moved from `utils/base/test-helpers.js`  
✅ **8 new powerful helpers** added (popup, download, upload, toast, frame, permissions, mocking, link validation)  
✅ **BasePage kept THIN** - only core navigation & locators  
✅ **Backward compatibility** - existing tests work without modification  

### Key Design Decisions:
✅ **Import utilities directly** in tests, not through BasePage  
✅ **Page objects remain thin** - composition over inheritance  
✅ **Framework-wide utilities** - reusable across all tests  
✅ **Clear separation** - UI actions vs Network actions  

### Benefits:
🎯 Clean separation of concerns  
📦 Easier to find and use helpers  
🧪 Better testability and maintainability  
🚀 Production-ready patterns  
📖 Comprehensive documentation  
🏋️ Covers advanced interview topics  

---

## 🎓 Interview Topics Covered

1. ✅ **Multi-tab/popup handling** - `clickAndWaitForPopup`
2. ✅ **Download testing** - `downloadAfterClick`
3. ✅ **File upload** - `uploadFile`
4. ✅ **Toast/notification testing** - `expectToast`
5. ✅ **Iframe handling** - `withinFrame`
6. ✅ **Network interception** - `waitForApiResponse`, `captureJsonResponse`
7. ✅ **API mocking** - `mockApi`, `mockApiError`
8. ✅ **Link validation** - `validateBrokenLinks`
9. ✅ **Browser permissions** - `grantPermissions`
10. ✅ **Network monitoring** - `monitorNetworkActivity`

---

**You now have a production-ready, interview-ready framework!** 🚀