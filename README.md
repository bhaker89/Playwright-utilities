# Playwright Automation Framework

Enterprise-ready Playwright automation framework with TypeScript for comprehensive end-to-end testing.

## 🌟 NEW: No-Code Automation Framework

**Write API tests without any coding!** QA team members can now create comprehensive API tests using simple YAML/JSON files.

### ✨ Quick Start - No Coding Required!

```yaml
name: Login API Test
curl: |
  curl 'https://api.example.com/login' \
    --data '{"email":"user@test.com","password":"pass123"}'

test_cases:
  - name: Successful login
    assertions:
      - type: status_code
        expected: 200
      - type: json_path
        path: $.token
        exists: true
```

**Run it:** `npm run test:nocode`

🎯 **[Complete No-Code Guide →](./docs/NO_CODE_FRAMEWORK_GUIDE.md)** | 📖 **[5-Minute Quick Start →](./docs/QUICKSTART.md)**

---

## 🚀 Features

### 🎨 No-Code Automation (NEW!)
- **Zero Coding Required**: Write tests in YAML/JSON
- **cURL Support**: Copy-paste from Postman/Browser DevTools
- **7 Assertion Types**: status_code, json_path, response_time, header, schema, contains, regex
- **Variable Extraction**: Extract & reuse data between tests
- **Data-Driven Testing**: CSV/JSON parameterization
- **Request Modification**: Dynamic headers, body, query params

### 🎭 Traditional Playwright Testing
- **Multi-Type Testing**: API, UI, Mobile Web, Visual Regression, and Integrated Testing
- **TypeScript**: Strict type checking for better code quality
- **Cross-Browser**: Chrome, Firefox, Safari, Edge support
- **Mobile Testing**: Device emulation and responsive testing
- **Visual Testing**: Screenshot comparison and visual regression
- **Performance Metrics**: Built-in performance monitoring
- **CI/CD Ready**: GitLab CI/CD pipeline with Docker support
- **Rich Reporting**: HTML, JSON, JUnit, and Allure reports
- **Page Object Model**: Maintainable and scalable test structure
- **Custom Fixtures**: Reusable test utilities and contexts

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd playwright-automation-framework
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npm run install:browsers
```

4. Configure environment:
```bash
cp config/.env.dev config/.env
# Edit config/.env with your settings
```

## 🏗️ Project Structure

```
playwright-automation-framework/
├── no-code-runner/            # 🆕 No-Code Framework
│   ├── types/                 # TypeScript definitions
│   ├── parsers/               # cURL & YAML/JSON parsers
│   ├── engine/                # Assertion & execution engines
│   ├── runner/                # Test runner
│   ├── cli.ts                 # Command-line interface
│   └── index.ts               # Public API
├── no-code-tests/             # 🆕 No-Code Test Suites
│   ├── api/                   # YAML/JSON API tests
│   │   ├── login-api.yaml
│   │   ├── user-management.yaml
│   │   ├── data-driven-login.yaml
│   │   └── advanced-examples.yaml
│   └── ui/                    # UI tests (future)
├── config/                    # Environment configurations
│   ├── .env.dev
│   ├── .env.staging
│   ├── .env.prod
│   └── environment.config.ts
├── tests/                     # Traditional Playwright tests
│   ├── api/                   # API tests
│   ├── ui/                    # UI tests
│   ├── mobile/                # Mobile tests
│   ├── visual/                # Visual regression tests
│   └── integrated/            # Integrated API+UI tests
├── pages/                     # Page Object Models
│   ├── base.page.ts
│   └── login.page.ts
├── components/                # Reusable UI components
├── utils/                     # Utility functions
│   ├── api-client.ts
│   ├── logger.ts
│   ├── test-helpers.ts
│   ├── schema-validator.ts
│   ├── performance-metrics.ts
│   ├── visual-testing.ts
│   ├── data-factory.ts
│   └── custom-reporter.ts
├── fixtures/                  # Test fixtures
│   └── test-fixtures.ts
├── test-data/                 # 🆕 Test data (CSV/JSON)
│   ├── login-data.csv
│   └── README.md
├── docs/                      # 🆕 Documentation
│   ├── NO_CODE_FRAMEWORK_GUIDE.md  # Complete no-code guide
│   └── QUICKSTART.md          # 5-minute quickstart
├── reports/                   # Test reports
├── ci-cd/                     # CI/CD configurations
├── playwright.config.ts       # Playwright configuration
├── tsconfig.json              # TypeScript configuration
├── Dockerfile                 # Docker configuration
├── .gitlab-ci.yml             # GitLab CI/CD pipeline
├── setup-nocode.sh            # 🆕 No-code setup script
└── README.md
```

## 🧪 Running Tests

### 🎨 No-Code Tests (NEW!)

```bash
# Run all no-code tests
npm run test:nocode

# Run no-code API tests
npm run test:nocode:api

# Run specific test file
npm run test:nocode -- --file ./no-code-tests/api/login-api.yaml

# Run tests from specific directory
npm run test:nocode -- --path ./no-code-tests/api

# Show help
npm run test:nocode -- --help
```

**📖 [Learn more about no-code testing →](./docs/QUICKSTART.md)**

### 🎭 Traditional Playwright Tests

```bash
# Run all tests
npm test

# Run specific test types
# API tests
npm run test:api

# UI tests
npm run test:ui

# Mobile tests
npm run test:mobile

# Visual tests
npm run test:visual

# Integrated tests
npm run test:integrated
```

### Run tests on specific browsers
```bash
# Chrome
npm run test:chrome

# Firefox
npm run test:firefox

# Safari
npm run test:safari

# All browsers
npm run test:all-browsers
```

### Run tests with UI Mode
```bash
npm run ui
```

### Run tests in headed mode
```bash
npm run test:headed
```

### Debug tests
```bash
npm run test:debug
```

### Run tests in parallel
```bash
npm run test:parallel
```

## 📊 Reports

### View HTML Report
```bash
npm run report
```

### Generate and view Allure Report
```bash
npm run report:allure
```

Reports are generated in:
- `playwright-report/` - HTML reports
- `test-results/` - JSON and JUnit reports
- `allure-report/` - Allure reports

## 🌍 Environment Configuration

Set the environment using the `TEST_ENV` variable:

```bash
# Development
TEST_ENV=dev npm test

# Staging
TEST_ENV=staging npm test

# Production
TEST_ENV=prod npm test
```

Environment variables are configured in:
- `config/.env.dev` - Development environment
- `config/.env.staging` - Staging environment
- `config/.env.prod` - Production environment

## 🧩 Writing Tests

### 🎨 No-Code API Test (NEW!)

**Create `my-test.yaml`:**
```yaml
name: User API Tests
description: Test user endpoints

# Paste cURL from Postman/Browser DevTools
curl: |
  curl 'https://reqres.in/api/users' \
    -H 'Content-Type: application/json' \
    --data '{"name":"John","job":"Developer"}'

test_cases:
  - name: Create user successfully
    assertions:
      - type: status_code
        expected: 201
      - type: json_path
        path: $.name
        expected: John
      - type: response_time
        max_ms: 2000
    extract_variables:
      - name: user_id
        source: json_path
        path: $.id

  - name: Create user with different data
    modify_request:
      body:
        name: "Jane"
        job: "QA Engineer"
    assertions:
      - type: status_code
        expected: 201
```

**Run it:**
```bash
npm run test:nocode -- --file ./my-test.yaml
```

**📖 [Complete No-Code Guide](./docs/NO_CODE_FRAMEWORK_GUIDE.md) | [Examples](./no-code-tests/api/)**

---

### 🎭 Traditional API Test Example

```typescript
import { test, expect } from '../../fixtures/test-fixtures';
import { APIClient } from '../../utils/api-client';

test.describe('API Tests', () => {
  let apiClient: APIClient;

  test.beforeAll(async () => {
    apiClient = new APIClient();
    await apiClient.init();
  });

  test('should get users', async () => {
    const response = await apiClient.get('/users');
    expect(response.status).toBe(200);
  });
});
```

### UI Test Example

```typescript
import { test, expect } from '../../fixtures/test-fixtures';
import { LoginPage } from '../../pages/login.page';

test.describe('Login Tests', () => {
  test('should login successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('username', 'password');
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

### Visual Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should match screenshot', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveScreenshot('homepage.png');
});
```

## 🐳 Docker

### Build Docker image
```bash
docker build -t playwright-automation .
```

### Run tests in Docker
```bash
docker run -e TEST_ENV=staging playwright-automation
```

## 🔄 GitLab CI/CD

The framework includes a comprehensive GitLab CI/CD pipeline with:

- **Install Stage**: Dependency installation and caching
- **Lint Stage**: Code quality checks
- **Test Stage**: Parallel test execution across browsers
- **Report Stage**: Allure report generation
- **Deploy Stage**: Report deployment to GitLab Pages

### Pipeline Stages

1. **install:dependencies** - Install npm packages and Playwright browsers
2. **lint:code** - Run ESLint, Prettier, and TypeScript checks
3. **test:api** - Run API tests
4. **test:ui:chromium/firefox/webkit** - Run UI tests on different browsers
5. **test:mobile** - Run mobile responsive tests
6. **test:visual** - Run visual regression tests
7. **test:integrated** - Run integrated API+UI tests
8. **report:allure** - Generate Allure reports
9. **pages** - Deploy reports to GitLab Pages

### Environment Variables for CI/CD

Configure these in GitLab CI/CD settings:
- `TEST_ENV` - Test environment (dev/staging/prod)
- `BASE_URL` - Application base URL
- `API_BASE_URL` - API base URL
- `AUTH_USERNAME` - Authentication username
- `AUTH_PASSWORD` - Authentication password
- `API_KEY` - API key for authentication

## 📝 Code Quality

### Run linting
```bash
npm run lint
npm run lint:fix
```

### Format code
```bash
npm run format
npm run format:check
```

### Type checking
```bash
npm run type-check
