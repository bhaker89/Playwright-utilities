# UI Test Generator - Natural Language to Executable Tests

## 🎯 Overview

The UI Test Generator transforms natural language descriptions into fully functional, self-healing Playwright tests. Simply describe what you want to test in plain English, and get production-ready test code with Page Objects.

## ✨ Features

- **🧠 Natural Language Processing**: Describe tests in plain English
- **📦 Page Object Generation**: Auto-generates maintainable Page Object classes
- **🩹 Self-Healing Integration**: Built-in self-healing support
- **🎭 Multiple Formats**: Output as Playwright tests or YAML (No-Code)
- **📊 Best Practices**: Generated code follows industry standards
- **⚡ Interactive CLI**: User-friendly command-line interface

## 🚀 Quick Start

### Interactive Mode (Recommended)

```bash
node platform/cli/generate-ui-tests-interactive.js
```

Follow the prompts:
1. Describe your test in natural language
2. Choose output format
3. Enable/disable self-healing
4. Optionally run the generated test immediately

### Programmatic Usage

```javascript
const { UITestGenerator } = require('./platform/generators/ui-test-generator');

const generator = new UITestGenerator();

const result = await generator.generateFromPrompt(
    'Test login flow with valid and invalid credentials',
    {
        format: 'playwright',      // 'playwright', 'yaml', 'both'
        withPageObjects: true,     // Generate Page Objects
        withSelfHealing: true,     // Enable self-healing
        outputPath: null           // Auto-generate path
    }
);

console.log('Generated files:', result.files);
```

## 📝 Example Prompts

### E-commerce
```
"Test the complete checkout flow: add product to cart, proceed to checkout, 
fill shipping details, select payment method, and place order"
```

### Authentication
```
"Test login with valid credentials, verify dashboard loads. 
Test login with invalid credentials, verify error message appears."
```

### Form Validation
```
"Test registration form validation: empty fields show errors, 
invalid email format shows warning, successful registration redirects to welcome page"
```

### Search Functionality
```
"Test search feature: enter query, verify results appear, 
filter by category, sort by price, verify filtered results"
```

## 📂 Generated Output Structure

### Playwright with Page Objects

```
generated-tests/
├── playwright/
│   └── login-flow.spec.js         # Test suite
└── pages/
    ├── login-page.page.js         # LoginPage POM
    └── dashboard-page.page.js     # DashboardPage POM
```

### YAML (No-Code)

```
generated-tests/
└── yaml/
    └── login-flow.yaml            # YAML test definition
```

## 🏗️ Generated Code Examples

### Page Object (with Self-Healing)

```javascript
const { BasePage } = require('./base.page');

class LoginPage extends BasePage {
    constructor(page) {
        super(page);
        this.url = '/login';
    }

    async navigate() {
        await this.page.goto('https://example.com/login');
        await this.page.waitForLoadState('networkidle');
    }

    get emailField() {
        return this.page.locator('input[type="email"]');
    }

    get passwordField() {
        return this.page.locator('input[type="password"]');
    }

    get loginButton() {
        return this.page.getByRole('button', { name: /login/i });
    }

    async fillEmailField(value) {
        await this.healer.executeWithHealing(
            'Email Field',
            this.emailField,
            async (loc) => await loc.fill(value)
        );
    }

    async fillPasswordField(value) {
        await this.healer.executeWithHealing(
            'Password Field',
            this.passwordField,
            async (loc) => await loc.fill(value)
        );
    }

    async clickLoginButton() {
        await this.healer.executeWithHealing(
            'Login Button',
            this.loginButton,
            async (loc) => await loc.click()
        );
    }
}

module.exports = { LoginPage };
```

### Playwright Test Suite

```javascript
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/login-page.page');

test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://example.com');
    });

    test('Valid Login', async ({ page }) => {
        const loginPage = new LoginPage(page);

        const testData = {
            email: "test@example.com",
            password: "password123"
        };

        await loginPage.navigate();
        await loginPage.fillEmailField(testData.email);
        await loginPage.fillPasswordField(testData.password);
        await loginPage.clickLoginButton();
        await page.waitForURL('**/dashboard**');

        expect(page.url()).toContain('/dashboard');
    });
});
```

### YAML Test (No-Code)

```yaml
name: Login Flow
description: Test user authentication
baseUrl: https://example.com
tests:
  - name: Valid Login
    type: ui
    steps:
      - action: navigate
        page: LoginPage
      - action: fill
        element: Email Field
        value: "{{email}}"
      - action: fill
        element: Password Field
        value: "{{password}}"
      - action: click
        element: Login Button
      - action: waitForUrl
        url: /dashboard
    assertions:
      - type: url
        expected: /dashboard
```

## ⚙️ Configuration

### Environment Variables

```bash
# AI Provider (for test generation)
AI_PROVIDER=anthropic          # anthropic, openai, groq
AI_API_KEY=sk-ant-api03-...
AI_MODEL=claude-3-sonnet-20240229

# Optional: Custom output directories
GENERATED_TESTS_DIR=./generated-tests
PAGES_DIR=./pages
```

### Custom Output Paths

```javascript
const result = await generator.generateFromPrompt(prompt, {
    format: 'playwright',
    outputPath: './custom/path/my-test.spec.js'
});
```

## 🎨 Generation Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `format` | string | `'playwright'` | Output format: `'playwright'`, `'yaml'`, `'both'` |
| `withPageObjects` | boolean | `true` | Generate Page Object classes |
| `withSelfHealing` | boolean | `true` | Enable self-healing in generated tests |
| `outputPath` | string | `null` | Custom output file path (auto-generates if null) |

## 🧪 Testing Generated Tests

### Run All Generated Tests

```bash
npx playwright test generated-tests/playwright/
```

### Run Specific Test

```bash
npx playwright test generated-tests/playwright/login-flow.spec.js
```

### Run with UI Mode (Debug)

```bash
npx playwright test --ui
```

### Run with Headed Browser

```bash
npx playwright test --headed
```

## 📊 AI Analysis Process

The UI Test Generator follows this workflow:

1. **Prompt Analysis**
   - Extracts test intent, user stories, expected behavior
   - Identifies pages, elements, and user flows
   - Infers reasonable selectors based on element names

2. **Test Plan Generation**
   - Creates structured test plan with pages and test cases
   - Defines test data variables for data-driven testing
   - Breaks complex flows into multiple test cases

3. **Code Generation**
   - Generates Page Object classes (if enabled)
   - Creates Playwright test files with assertions
   - Integrates self-healing mechanisms

4. **Validation**
   - Ensures generated selectors are valid
   - Verifies code syntax
   - Applies best practices

## 🏆 Best Practices

### Writing Effective Prompts

✅ **DO:**
- Be specific about user flows: "Login → Add to cart → Checkout"
- Mention test data: "Test with email: user@example.com"
- Include expected outcomes: "Verify success message appears"
- Specify validations: "Check error for invalid email format"

❌ **DON'T:**
- Be too vague: "Test the website"
- Skip critical steps: "Test checkout" (missing add to cart)
- Omit assertions: "Click buttons and fill forms"

### Example: Good vs Bad Prompts

**❌ Bad:**
```
Test login
```

**✅ Good:**
```
Test login functionality:
1. Navigate to login page
2. Enter valid email and password
3. Click login button
4. Verify user is redirected to dashboard
5. Test with invalid credentials and verify error message
```

## 🔧 Advanced Usage

### Custom Selector Strategy

Modify generated Page Objects to use custom selectors:

```javascript
// Before (auto-generated)
get emailField() {
    return this.page.locator('input[type="email"]');
}

// After (custom)
get emailField() {
    return this.page.getByTestId('email-input');
}
```

### Adding Custom Assertions

Extend generated tests with additional checks:

```javascript
test('Valid Login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.navigate();
    await loginPage.fillEmailField('test@example.com');
    await loginPage.fillPasswordField('password123');
    await loginPage.clickLoginButton();

    // Generated assertion
    expect(page.url()).toContain('/dashboard');

    // Custom assertions
    await expect(page.locator('.welcome-message')).toBeVisible();
    await expect(page.locator('.user-name')).toHaveText('Test User');
});
```

### Integrating with CI/CD

```yaml
# .github/workflows/generated-tests.yml
name: Run Generated Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm install
      
      - name: Run generated tests
        run: npx playwright test generated-tests/playwright/
      
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## 🐛 Troubleshooting

### Issue: AI returns invalid JSON

**Solution:** Check AI provider configuration

```bash
# Verify API key
echo $AI_API_KEY

# Test with Groq (free tier)
AI_PROVIDER=groq node platform/cli/ui-test-generator-cli.js
```

### Issue: Generated selectors don't work

**Solution:** Manually update selectors in Page Objects

1. Inspect the target page in browser DevTools
2. Update selector in Page Object getter
3. Run test to verify

### Issue: Page Objects not found

**Solution:** Ensure `pages/` directory exists

```bash
mkdir -p pages
```

## 📚 Additional Resources

- [Self-Healing Guide](./SELF_HEALING_GUIDE.md)
- [Playwright Selectors](https://playwright.dev/docs/selectors)
- [Page Object Model Best Practices](https://playwright.dev/docs/pom)

## 🤝 Contributing

Found a bug or have an enhancement idea?

1. Check existing issues
2. Open a new issue with details
3. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

---

**🎉 Happy Test Generation! 🎉**