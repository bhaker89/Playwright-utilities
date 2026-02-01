# Framework Reference Guide

> **Complete Framework Architecture & Component Documentation**  
> This document provides detailed explanations of every folder, file, configuration, and component in the Playwright Automation Framework.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Root Level Files](#root-level-files)
3. [Configuration Files Explained](#configuration-files-explained)
4. [Folder Structure Deep Dive](#folder-structure-deep-dive)
5. [Core Components](#core-components)
6. [Testing Patterns](#testing-patterns)
7. [Environment & Configuration Management](#environment--configuration-management)
8. [Reporting & Logging](#reporting--logging)
9. [Database Integration](#database-integration)
10. [No-Code Framework](#no-code-framework)
11. [CI/CD Integration](#cicd-integration)
12. [Utilities & Helpers](#utilities--helpers)

---

## Project Overview

### Framework Type
**Enterprise-ready Playwright Automation Framework** built with **JavaScript**

### Supported Testing Types
- ✅ **UI Testing** - Web application testing with Page Object Model
- ✅ **API Testing** - RESTful API testing with schema validation
- ✅ **Mobile Testing** - Responsive and mobile device testing
- ✅ **Visual Regression Testing** - Screenshot comparison testing
- ✅ **Integrated Testing** - Combined UI + API + Database testing
- ✅ **No-Code Testing** - YAML/JSON based test definitions
- ✅ **Database Testing** - PostgreSQL and MongoDB integration

### Technology Stack
- **Test Framework**: Playwright Test (@playwright/test)
- **Language**: JavaScript (ES6+)
- **HTTP Client**: Axios
- **Logging**: Winston
- **Schema Validation**: Joi, AJV
- **Databases**: PostgreSQL (pg), MongoDB
- **Reporting**: HTML, Allure, JSON, JUnit
- **CI/CD**: GitLab CI, Docker support

---

## Root Level Files

### 1. `package.json`

**Purpose**: Defines project metadata, dependencies, and npm scripts.

**Key Sections:**

#### Project Metadata
```json
{
  "name": "playwright-automation-framework",
  "version": "1.0.0",
  "description": "Enterprise-ready Playwright automation framework with JavaScript"
}
```

#### Scripts (npm commands)

| Script | Command | Purpose |
|--------|---------|---------|
| `npm test` | `playwright test` | Run all tests |
| `npm run test:api` | `playwright test tests/api` | Run only API tests |
| `npm run test:ui` | `playwright test tests/ui` | Run only UI tests |
| `npm run test:mobile` | `playwright test tests/mobile` | Run mobile tests |
| `npm run test:visual` | `playwright test tests/visual` | Run visual regression tests |
| `npm run test:integrated` | `playwright test tests/integrated` | Run integrated tests |
| `npm run test:headed` | `playwright test --headed` | Run with visible browser |
| `npm run test:debug` | `playwright test --debug` | Debug mode with inspector |
| `npm run test:chrome` | `playwright test --project=chromium` | Run on Chrome only |
| `npm run test:firefox` | `playwright test --project=firefox` | Run on Firefox only |
| `npm run test:safari` | `playwright test --project=webkit` | Run on Safari only |
| `npm run test:all-browsers` | Run on all browsers | Test across all browsers |
| `npm run test:parallel` | `playwright test --workers=4` | Run tests with 4 parallel workers |
| `npm run report` | `playwright show-report` | Open HTML report |
| `npm run report:allure` | `allure generate && allure open` | Generate Allure report |
| `npm run ui` | `playwright test --ui` | Open Playwright UI mode |
| `npm run codegen` | `playwright codegen` | Record new tests |
| `npm run install:browsers` | `playwright install --with-deps` | Install browser binaries |
| `npm run lint` | `eslint . --ext .js` | Check code quality |
| `npm run lint:fix` | `eslint . --ext .js --fix` | Fix linting issues |
| `npm run format` | `prettier --write` | Format code |
| `npm run clean` | Remove all reports | Clean test artifacts |
| `npm run test:nocode` | `node no-code-runner/cli.js run` | Run no-code tests |

#### Dependencies

**devDependencies** (development only):
- `@playwright/test` - Playwright test framework
- `allure-commandline` & `allure-playwright` - Allure reporting
- `eslint` & related plugins - Code quality
- `prettier` - Code formatting

**dependencies** (runtime):
- `axios` - HTTP client for API testing
- `dotenv` - Environment variable management
- `joi` & `ajv` - Schema validation
- `winston` - Logging framework
- `pg` - PostgreSQL client
- `mongodb` - MongoDB client
- `js-yaml` - YAML parsing for no-code tests
- `jsonpath-plus` - JSON path queries
- `yargs` - CLI argument parsing
- `csv-parse` - CSV file parsing
- `curlconverter` - Convert cURL to JavaScript

---

### 2. `playwright.config.js`

**Purpose**: Main Playwright configuration file that controls test execution behavior.

**Key Configurations:**

#### Test Directory
```javascript
testDir: './tests'
```
Specifies where Playwright looks for test files.

#### Parallel Execution
```javascript
fullyParallel: true
```
Tests run in parallel by default for faster execution.

#### Retries
```javascript
retries: process.env.CI ? 2 : 0
```
- **CI environment**: Retry failed tests twice
- **Local**: No retries (fail fast for debugging)

#### Workers (Parallel Runners)
```javascript
workers: process.env.CI ? 4 : undefined
```
- **CI**: Use 4 parallel workers
- **Local**: Auto-detect based on CPU cores

#### Reporters
```javascript
reporter: [
  ['list'],                    // Console output
  ['html'],                    // HTML report
  ['json'],                    // JSON output
  ['junit'],                   // JUnit XML for CI
  ['allure-playwright']        // Allure report
]
```

**Output locations:**
- HTML: `playwright-report/`
- JSON: `test-results/results.json`
- JUnit: `test-results/junit.xml`
- Allure: `allure-results/`

#### Global Settings (`use` block)

```javascript
use: {
  baseURL: process.env.BASE_URL,           // Base URL for navigation
  trace: 'on-first-retry',                 // Trace on failures
  screenshot: 'only-on-failure',           // Screenshot on failure
  video: 'retain-on-failure',              // Video on failure
  actionTimeout: 15000,                     // 15s action timeout
  navigationTimeout: 30000,                 // 30s navigation timeout
}
```

#### Timeouts
- **Test timeout**: 60 seconds per test
- **Global timeout**: 1 hour for entire test suite (CI only)
- **Expect timeout**: 10 seconds for assertions

#### Browser Projects

**Desktop Browsers:**
- **chromium** - Chrome/Edge testing (1920x1080)
- **firefox** - Firefox testing (1920x1080)
- **webkit** - Safari testing (1920x1080)
- **edge** - Microsoft Edge (requires Edge installed)

**Mobile Browsers:**
- **Mobile Chrome** - Android (Pixel 5 emulation)
- **Mobile Safari** - iOS (iPhone 13 emulation)

**API Testing Project:**
```javascript
{
  name: 'api',
  testMatch: /.*\.api\.spec\.js/,
  use: {
    baseURL: process.env.API_BASE_URL
  }
}
```
API tests run without browser context.

#### Environment Loading
```javascript
const environment = process.env.TEST_ENV || 'dev';
dotenv.config({ path: `config/.env.${environment}` });
```
Automatically loads environment-specific variables from `config/.env.*` files.

---

### 3. `tsconfig.json`

**Purpose**: TypeScript configuration (kept for IDE support even though framework is JavaScript).

**Why it exists**: 
- Provides IntelliSense in VS Code
- Enables type checking in comments (JSDoc)
- Useful for future TypeScript migration if needed

**You can ignore this file** - the framework is 100% JavaScript.

---

### 4. `.eslintrc.json`

**Purpose**: ESLint configuration for code quality and style enforcement.

**What it does**:
- Enforces consistent code style
- Catches common JavaScript errors
- Integrates Playwright-specific rules
- Works with Prettier for formatting

**Usage**:
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

---

### 5. `.prettierrc.json`

**Purpose**: Prettier configuration for code formatting.

**What it does**:
- Formats JavaScript, JSON, and Markdown files
- Ensures consistent code style across team
- Integrates with ESLint

**Usage**:
```bash
npm run format        # Format all files
npm run format:check  # Check formatting
```

---

### 6. `.gitlab-ci.yml`

**Purpose**: GitLab CI/CD pipeline configuration.

**What it does**:
- Defines automated test execution on commits/merges
- Runs tests in Docker containers
- Generates test reports
- Manages artifacts (reports, screenshots)

**Typical pipeline stages**:
1. Install dependencies
2. Run linting
3. Run tests (parallel jobs)
4. Generate reports
5. Publish artifacts

---

### 7. `Dockerfile` & `docker-compose.yml`

**Purpose**: Container configuration for consistent test execution environment.

**Dockerfile**: Defines the test environment image
- Base image with Node.js
- Playwright browser dependencies
- Project dependencies

**docker-compose.yml**: Multi-container setup
- Test runner container
- Database containers (PostgreSQL, MongoDB)
- Network configuration

**Usage**:
```bash
docker-compose up -d          # Start services
docker-compose run tests      # Run tests in container
docker-compose down           # Stop services
```

---

### 8. `README.md`

**Purpose**: Project introduction and quick start guide.

**Should contain**:
- Project description
- Quick setup instructions
- Links to detailed documentation
- Contribution guidelines

---

### 9. `RUNNING_TESTS.md`

**Purpose**: Quick reference for test execution commands.

**Contains**: Common commands and examples for running tests.

---

## Folder Structure Deep Dive

```
Playwright-Automation/
├── tests/                    # All test files
├── pages/                    # Page Object Model classes
├── components/               # Reusable UI components
├── fixtures/                 # Test fixtures and setup
├── utils/                    # Utility functions and helpers
├── config/                   # Configuration files
├── no-code-runner/           # No-code test execution engine
├── no-code-tests/            # YAML/JSON test definitions
├── test-data/                # Test data files
├── reports/                  # Generated test reports
├── test-results/             # Test execution artifacts
├── logs/                     # Log files
└── docs/                     # Documentation
```

---

## 1. `tests/` Folder

**Purpose**: Contains all test specification files.

### Subfolders:

#### `tests/api/`
**Purpose**: API testing without browser.

**Example files**:
- `users.api.spec.js` - User management API tests
- `http-status.api.spec.js` - HTTP status code tests
- `order-nexus.spec.js` - Order Nexus service tests
- `configurable-api.spec.js` - Configurable API tests

**Typical structure**:
```javascript
const { test, expect } = require('../fixtures/base-test');

test.describe('API Test Suite', () => {
  test('should return 200 status', async ({ apiClient }) => {
    const response = await apiClient.get('/endpoint');
    expect(response.status).toBe(200);
  });
});
```

#### `tests/ui/`
**Purpose**: UI testing with browser automation.

**Example files**:
- `login-functionality.spec.js` - Login page tests
- `navigation.spec.js` - Navigation tests
- `form-submission.spec.js` - Form tests

**Typical structure**:
```javascript
const { test, expect } = require('../fixtures/base-test');

test.describe('UI Test Suite', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'user');
    await page.fill('#password', 'pass');
    await page.click('#login-btn');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

#### `tests/mobile/`
**Purpose**: Mobile-specific tests (responsive, device emulation).

**What's tested**:
- Mobile viewport rendering
- Touch interactions
- Mobile-specific features
- Responsive design

#### `tests/visual/`
**Purpose**: Visual regression testing (screenshot comparison).

**What's tested**:
- UI appearance consistency
- Screenshot comparison
- Visual differences detection

**Usage**:
```javascript
await expect(page).toHaveScreenshot('homepage.png');
```

#### `tests/integrated/`
**Purpose**: End-to-end tests combining UI + API + Database.

**Example**: 
- Create user via API
- Login via UI
- Verify database record
- Check UI reflects changes

#### `tests/workflows/`
**Purpose**: Complex user workflows spanning multiple pages/steps.

**Example**:
- Complete checkout process
- Multi-step registration
- Order fulfillment flow

---

## 2. `pages/` Folder - Page Object Model

**Purpose**: Encapsulates page-specific elements and actions.

**Why use Page Objects?**
- **Maintainability**: Change locators in one place
- **Reusability**: Share page logic across tests
- **Readability**: Tests read like business scenarios

### File Structure:

#### `pages/base.page.js`
**Purpose**: Base class with common page functionality.

**Provides**:
```javascript
class BasePage {
  constructor(page) {
    this.page = page;
  }

  async goto(url) { }
  async waitForElement(selector) { }
  async clickElement(selector) { }
  async fillInput(selector, value) { }
  async getText(selector) { }
}
```

#### `pages/login.page.js`
**Purpose**: Login page specific logic.

**Example**:
```javascript
class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.usernameInput = '#username';
    this.passwordInput = '#password';
    this.loginButton = '#login-btn';
  }

  async login(username, password) {
    await this.fillInput(this.usernameInput, username);
    await this.fillInput(this.passwordInput, password);
    await this.clickElement(this.loginButton);
  }
}
```

**Usage in tests**:
```javascript
const loginPage = new LoginPage(page);
await loginPage.login('user', 'pass');
```

---

## 3. `components/` Folder

**Purpose**: Reusable UI components (headers, modals, menus).

#### `components/base.component.js`
**Purpose**: Base class for component objects.

**Example components**:
- Header component (navigation, user menu)
- Footer component
- Modal dialogs
- Dropdowns
- Date pickers

**Why separate from pages?**
- Components appear on multiple pages
- Single source of truth for component behavior
- Easier testing of component interactions

---

## 4. `fixtures/` Folder

**Purpose**: Extend Playwright's test fixtures with custom functionality.

### What are fixtures?
Fixtures are **setup and teardown functions** that prepare test environment:
- Initialize services (API client, database)
- Set up authentication
- Provide test data
- Clean up after tests

### Key Files:

#### `fixtures/base-test.js`
**Purpose**: Main fixture file extending Playwright test.

**Provides custom fixtures**:
```javascript
const base = require('@playwright/test');

exports.test = base.test.extend({
  // API client fixture
  apiClient: async ({}, use) => {
    const client = new APIClient();
    await use(client);
    await client.dispose();
  },

  // Database fixture
  dbClient: async ({}, use) => {
    const db = await createDbClient();
    await use(db);
    await db.close();
  },

  // Logger fixture
  logger: async ({}, use) => {
    const logger = createLogger();
    await use(logger);
  },

  // Shared context fixture
  sharedContext: async ({}, use) => {
    const context = new SharedTestContext();
    await use(context);
  }
});
```

**Usage in tests**:
```javascript
const { test } = require('../fixtures/base-test');

test('my test', async ({ page, apiClient, dbClient, logger }) => {
  // All fixtures are automatically available
});
```

#### `fixtures/test-fixtures.js`
**Purpose**: Additional test data fixtures.

**Provides**:
- Test user data
- Mock API responses
- Sample database records

#### `fixtures/auth.fixture.js`
**Purpose**: Authentication-related fixtures.

**Provides**:
- Authenticated page context
- Auth tokens
- User sessions

---

## 5. `utils/` Folder - Utilities & Helpers

**Purpose**: Reusable utility functions and helper classes.

### Key Utility Files:

#### `utils/api-client.js`
**Purpose**: HTTP client wrapper for API testing.

**Features**:
- GET, POST, PUT, DELETE, PATCH methods
- Request/response logging
- Error handling
- Authentication headers
- Response validation

**Usage**:
```javascript
const client = new APIClient({ baseURL: 'https://api.example.com' });
const response = await client.get('/users/1');
expect(response.status).toBe(200);
```

#### `utils/multi-service-api-client.js`
**Purpose**: Manage multiple API services.

**Features**:
- Multiple service configurations
- Service-specific auth
- Centralized API management

**Configuration** (from `config/services.config.js`):
```javascript
{
  orderNexus: {
    baseURL: 'https://api.ordernexus.com',
    auth: { token: 'xxx' }
  },
  userService: {
    baseURL: 'https://api.users.com',
    auth: { apiKey: 'yyy' }
  }
}
```

#### `utils/logger.js`
**Purpose**: Winston-based logging system.

**Features**:
- Multiple log levels (error, warn, info, debug)
- File logging (`logs/test-execution.log`)
- Console logging
- Timestamped logs
- Contextual logging

**Usage**:
```javascript
const logger = require('./utils/logger');
logger.info('Test started');
logger.error('Test failed', { error: err });
```

#### `utils/auth-helper.js`
**Purpose**: Authentication utilities.

**Features**:
- Login helper functions
- Token management
- Session handling
- Cookie management

#### `utils/schema-validator.js`
**Purpose**: JSON schema validation.

**Features**:
- Joi schema validation
- AJV schema validation
- Custom validation rules

**Usage**:
```javascript
const { validateSchema } = require('./utils/schema-validator');
const isValid = validateSchema(responseData, userSchema);
```

#### `utils/visual-testing.js`
**Purpose**: Visual regression testing utilities.

**Features**:
- Screenshot comparison
- Threshold configuration
- Masking dynamic content

#### `utils/data-factory.js`
**Purpose**: Generate test data.

**Features**:
- Fake data generation
- Random data creation
- Data templates

#### `utils/test-helpers.js`
**Purpose**: Common test helper functions.

**Functions**:
- Wait utilities
- Retry mechanisms
- Data cleanup helpers
- String manipulation

#### `utils/custom-reporter.js`
**Purpose**: Custom test reporter implementation.

**Features**:
- Custom report formatting
- Slack/email notifications
- Custom metrics

#### `utils/shared-test-context.js`
**Purpose**: Share data between tests and hooks.

**Features**:
- Store test data
- Share across test steps
- Context management

**Usage**:
```javascript
const context = new SharedTestContext();
context.set('userId', 123);
const userId = context.get('userId');
```

---

### `utils/database/` Subfolder

**Purpose**: Database client implementations.

#### `utils/database/db-client.base.js`
**Purpose**: Abstract base class for database clients.

**Defines interface**:
- `connect()`
- `disconnect()`
- `query()`
- `insert()`
- `update()`
- `delete()`

#### `utils/database/postgres-client.js`
**Purpose**: PostgreSQL client implementation.

**Features**:
- Connection pooling
- Parameterized queries
- Transaction support

**Usage**:
```javascript
const pgClient = new PostgresClient(config);
await pgClient.connect();
const users = await pgClient.query('SELECT * FROM users');
```

#### `utils/database/mongo-client.js`
**Purpose**: MongoDB client implementation.

**Features**:
- Connection management
- Collection operations
- Aggregation queries

**Usage**:
```javascript
const mongoClient = new MongoClient(config);
await mongoClient.connect();
const users = await mongoClient.find('users', { active: true });
```

#### `utils/database/db-client-factory.js`
**Purpose**: Factory pattern for creating database clients.

**Usage**:
```javascript
const dbClient = createDbClient('postgres', config);
// or
const dbClient = createDbClient('mongodb', config);
```

#### `utils/database/db-assertions.js`
**Purpose**: Database-specific assertions for testing.

**Features**:
```javascript
await assertRecordExists(db, 'users', { id: 1 });
await assertRecordCount(db, 'orders', 5);
await assertFieldValue(db, 'users', { id: 1 }, 'status', 'active');
```

#### `utils/database/index.js`
**Purpose**: Main export file for database utilities.

---

## 6. `config/` Folder

**Purpose**: Environment and service configurations.

### Key Files:

#### `config/environment.config.js`
**Purpose**: Load and parse environment variables.

**How it works**:
1. Reads `TEST_ENV` variable (defaults to 'dev')
2. Loads corresponding `.env.{environment}` file
3. Parses and provides typed configuration object

**Configuration structure**:
```javascript
{
  testEnv: 'dev',
  baseURL: 'https://dev.example.com',
  uiBaseURL: 'https://dev.example.com',
  apiBaseURL: 'https://api-dev.example.com',
  authUsername: 'testuser',
  authPassword: 'testpass',
  apiKey: 'xxx',
  
  // PostgreSQL config
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'test_db',
    user: 'postgres',
    password: 'postgres',
    ssl: false,
    maxPoolSize: 10
  },
  
  // MongoDB config
  mongodb: {
    uri: 'mongodb://localhost:27017',
    database: 'test_db',
    options: {
      maxPoolSize: 10,
      connectTimeoutMS: 10000
    }
  }
}
```

**Usage in tests**:
```javascript
const { env } = require('../config/environment.config');
console.log(env.apiBaseURL);
```

#### `config/services.config.js`
**Purpose**: Configuration for multiple microservices.

**Example**:
```javascript
module.exports = {
  services: {
    orderNexus: {
      baseURL: process.env.ORDER_NEXUS_BASE_URL,
      token: process.env.STAG_ORDER_NEXUS_TOKEN,
      timeout: 30000
    },
    userService: {
      baseURL: process.env.USER_SERVICE_URL,
      apiKey: process.env.USER_SERVICE_KEY
    }
  }
};
```

#### `config/.env.dev`, `.env.staging`, `.env.prod`
**Purpose**: Environment-specific variables.

**Never commit these files if they contain secrets!** Use `.gitignore`.

---

## 7. `no-code-runner/` Folder

**Purpose**: Engine for executing tests defined in YAML/JSON (no code required).

### How it works:

1. **Test definitions** are written in YAML/JSON (`no-code-tests/` folder)
2. **No-code runner** reads and parses these files
3. **Executes actions** based on definitions
4. **Reports results** like regular tests

### Key Files:

#### `no-code-runner/index.js`
**Purpose**: Main execution engine.

**Features**:
- Parse YAML/JSON test definitions
- Execute API requests
- Perform assertions
- Handle variables and data

#### `no-code-runner/cli.js`
**Purpose**: Command-line interface.

**Usage**:
```bash
npm run test:nocode                  # Run all no-code tests
npm run test:nocode:validate         # Validate test definitions
```

### Example No-Code Test:

**File**: `no-code-tests/user-api.yaml`
```yaml
name: User API Tests
tests:
  - name: Get user by ID
    request:
      method: GET
      url: /users/1
    expect:
      status: 200
      body:
        id: 1
        name: "John Doe"
        
  - name: Create new user
    request:
      method: POST
      url: /users
      body:
        name: "Jane Doe"
        email: "jane@example.com"
    expect:
      status: 201
```

**Benefits**:
- Non-developers can write tests
- Faster test creation
- Reduced code maintenance

---

## 8. `no-code-tests/` Folder

**Purpose**: Store YAML/JSON test definitions.

**File formats**:
- `.yaml` / `.yml` - YAML format (recommended)
- `.json` - JSON format

---

## 9. `test-data/` Folder

**Purpose**: Static test data files.

**Contains**:
- CSV files with test data
- JSON fixtures
- Sample files for upload testing
- Configuration templates

**Example**:
```
test-data/
├── users.csv           # User test data
├── products.json       # Product catalog
├── sample-upload.pdf   # File for upload tests
└── templates/          # Data templates
```

---

## 10. `reports/` Folder

**Purpose**: Generated test reports (not committed to git).

**Contains**:
- `playwright-report/` - HTML reports
- `allure-report/` - Allure reports
- Custom reports

---

## 11. `test-results/` Folder

**Purpose**: Test execution artifacts.

**Contains**:
- Screenshots (on failure)
- Videos (on failure)
- Traces (for debugging)
- `results.json` - JSON report
- `junit.xml` - JUnit report

---

## 12. `logs/` Folder

**Purpose**: Winston log files.

**Contains**:
- `test-execution.log` - Main log file
- `error.log` - Error logs only
- Timestamped logs

**Log format**:
```
2024-01-15 10:30:45 [INFO]: Test started - Login functionality
2024-01-15 10:30:46 [DEBUG]: API request - GET /api/users/1
2024-01-15 10:30:46 [ERROR]: Test failed - Expected 200 but got 404
```

---

## 13. `docs/` Folder

**Purpose**: Framework documentation.

**Files**:
- `ARCHITECTURE.md` - Detailed architecture (1300+ lines)
- `SETUP_AND_GETTING_STARTED.md` - Setup guide
- `FRAMEWORK_REFERENCE.md` - This document
- `SHARED_CONTEXT_QUICK_REFERENCE.md` - Shared context usage
- `NO_CODE_FRAMEWORK_GUIDE.md` - No-code testing guide
- `TS_TO_JS_CONVERSION_ANALYSIS.md` - Conversion documentation

---

## Core Components

### 1. Test Execution Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. npm test (or specific test command)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  2. playwright.config.js loaded                         │
│     - Environment variables loaded from config/.env.*   │
│     - Browser projects configured                       │
│     - Reporters initialized                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  3. Test files discovered in tests/ folder              │
│     - API tests (*.api.spec.js)                         │
│     - UI tests (*.spec.js)                              │
│     - Other test types                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  4. Fixtures initialized (fixtures/base-test.js)        │
│     - apiClient fixture                                 │
│     - dbClient fixture                                  │
│     - logger fixture                                    │
│     - sharedContext fixture                             │
│     - page fixture (from Playwright)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  5. Test execution (parallel or sequential)             │
│     - beforeAll hooks run                               │
│     - beforeEach hooks run before each test             │
│     - Test body executes                                │
│     - afterEach hooks run after each test               │
│     - afterAll hooks run                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  6. Test artifacts collected                            │
│     - Screenshots (on failure)                          │
│     - Videos (on failure)                               │
│     - Traces (on retry)                                 │
│     - Logs written to logs/                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  7. Reports generated                                   │
│     - HTML report (playwright-report/)                  │
│     - JSON report (test-results/results.json)           │
│     - JUnit XML (test-results/junit.xml)                │
│     - Allure data (allure-results/)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  8. Exit with status code                               │
│     - 0 = All tests passed                              │
│     - 1 = Some tests failed                             │
└─────────────────────────────────────────────────────────┘
```

---

## Testing Patterns

### 1. API Testing Pattern

```javascript
const { test, expect } = require('../fixtures/base-test');

test.describe('User API', () => {
  test('should get user by ID', async ({ apiClient }) => {
    // Make API request
    const response = await apiClient.get('/users/1');
    
    // Assert status
    expect(response.status).toBe(200);
    
    // Assert response structure
    expect(response.data).toHaveProperty('id');
    expect(response.data).toHaveProperty('name');
    
    // Assert specific values
    expect(response.data.id).toBe(1);
  });
});
```

### 2. UI Testing Pattern

```javascript
const { test, expect } = require('../fixtures/base-test');

test.describe('Login Page', () => {
  test('should login successfully', async ({ page }) => {
    // Navigate to page
    await page.goto('/login');
    
    // Fill form
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'testpass');
    
    // Click button
    await page.click('#login-btn');
    
    // Assert navigation
    await expect(page).toHaveURL('/dashboard');
    
    // Assert element visible
    await expect(page.locator('.welcome-message')).toBeVisible();
  });
});
```

### 3. Database Testing Pattern

```javascript
const { test, expect } = require('../fixtures/base-test');

test.describe('Database Tests', () => {
  test('should verify user record', async ({ dbClient }) => {
    // Query database
    const users = await dbClient.query(
      'SELECT * FROM users WHERE id = $1',
      [1]
    );
    
    // Assert results
    expect(users.length).toBe(1);
    expect(users[0].name).toBe('John Doe');
  });
});
```

### 4. Integrated Testing Pattern

```javascript
const { test, expect } = require('../fixtures/base-test');

test.describe('E2E User Registration', () => {
  test('should register, login, and verify', async ({ 
    page, 
    apiClient, 
    dbClient 
  }) => {
    // 1. Create user via API
    const response = await apiClient.post('/users', {
      username: 'newuser',
      email: 'new@example.com'
    });
    const userId = response.data.id;
    
    // 2. Verify in database
    const dbUser = await dbClient.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    expect(dbUser[0].email).toBe('new@example.com');
    
    // 3. Login via UI
    await page.goto('/login');
    await page.fill('#username', 'newuser');
    await page.fill('#password', 'password123');
    await page.click('#login-btn');
    
    // 4. Verify UI state
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.user-email'))
      .toHaveText('new@example.com');
  });
});
```

---

## Environment & Configuration Management

### Environment Variables Hierarchy

1. **System environment variables** (highest priority)
2. **`.env.{environment}` files** in `config/` folder
3. **Default values** in `environment.config.js`

### Switching Environments

**Set environment before running tests:**

```bash
# Linux/Mac
TEST_ENV=staging npm test

# Windows CMD
set TEST_ENV=staging && npm test

# Windows PowerShell
$env:TEST_ENV="staging"; npm test
```

### Accessing Configuration in Tests

```javascript
const { env } = require('../config/environment.config');

test('example', async ({ page }) => {
  console.log('Testing on:', env.testEnv);
  console.log('Base URL:', env.baseURL);
  console.log('API URL:', env.apiBaseURL);
  
  await page.goto(env.uiBaseURL);
});
```

---

## Reporting & Logging

### 1. HTML Report

**Location**: `playwright-report/index.html`

**View command**:
```bash
npm run report
```

**Features**:
- Test results overview
- Filter by status (passed/failed/skipped)
- Detailed error messages
- Screenshots and videos
- Execution timeline

### 2. Allure Report

**Location**: `allure-report/index.html`

**Generate command**:
```bash
npm run report:allure
```

**Features**:
- Beautiful dashboard
- Test history and trends
- Categorization
- Attachments (screenshots, logs)
- Retries visualization

### 3. JSON Report

**Location**: `test-results/results.json`

**Usage**: CI/CD integration, custom parsing

**Structure**:
```json
{
  "suites": [...],
  "tests": [...],
  "stats": {
    "total": 50,
    "passed": 45,
    "failed": 5,
    "skipped": 0
  }
}
```

### 4. JUnit XML Report

**Location**: `test-results/junit.xml`

**Usage**: Jenkins, GitLab CI, GitHub Actions

### 5. Winston Logs

**Location**: `logs/test-execution.log`

**View logs**:
```bash
cat logs/test-execution.log
tail -f logs/test-execution.log  # Live tail
```

**Log in tests**:
```javascript
test('example', async ({ logger }) => {
  logger.info('Test started');
  logger.debug('Debugging info', { userId: 123 });
  logger.error('Error occurred', { error: err });
});
```

---

## Database Integration

### Supported Databases

1. **PostgreSQL** (`pg` package)
2. **MongoDB** (`mongodb` package)

### Configuration

**PostgreSQL** (`.env` file):
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=test_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

**MongoDB** (`.env` file):
```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB=test_db
```

### Using Database in Tests

**Via fixture**:
```javascript
test('database test', async ({ dbClient }) => {
  const result = await dbClient.query('SELECT * FROM users');
  expect(result.length).toBeGreaterThan(0);
});
```

**Direct usage**:
```javascript
const { createDbClient } = require('../utils/database');

test('direct db usage', async () => {
  const db = createDbClient('postgres', config);
  await db.connect();
  
  const users = await db.query('SELECT * FROM users');
  expect(users.length).toBeGreaterThan(0);
  
  await db.disconnect();
});
```

---

## CI/CD Integration

### GitLab CI Pipeline

**File**: `.gitlab-ci.yml`

**Typical stages**:

```yaml
stages:
  - install
  - lint
  - test
  - report

install:
  stage: install
  script:
    - npm ci
    - npx playwright install --with-deps

lint:
  stage: lint
  script:
    - npm run lint

test:api:
  stage: test
  script:
    - npm run test:api
  artifacts:
    paths:
      - test-results/
      - playwright-report/

test:ui:
  stage: test
  script:
    - npm run test:ui
  artifacts:
    paths:
      - test-results/
      - playwright-report/

report:
  stage: report
  script:
    - npm run report:allure
  artifacts:
    paths:
      - allure-report/
```

### Docker Integration

**Run tests in Docker**:
```bash
docker-compose up -d              # Start services
docker-compose run tests npm test # Run tests
docker-compose down               # Stop services
```

---

## Best Practices

### 1. Test Organization
- Keep tests small and focused
- One assertion per test when possible
- Use descriptive test names
- Group related tests with `test.describe()`

### 2. Page Objects
- Create page objects for all pages
- Keep selectors in page objects
- Avoid duplicating selectors across tests

### 3. Fixtures
- Use fixtures for setup/teardown
- Keep fixtures focused and reusable
- Clean up resources in fixtures

### 4. Environment Management
- Never hardcode URLs or credentials
- Use environment variables
- Keep `.env` files out of git

### 5. Assertions
- Use appropriate Playwright assertions
- Provide clear assertion messages
- Check both positive and negative cases

### 6. Logging
- Log important test steps
- Log API requests/responses
- Use appropriate log levels

### 7. Database Testing
- Clean up test data after tests
- Use transactions when possible
- Isolate database tests

### 8. Reporting
- Review reports after test runs
- Attach screenshots/videos on failure
- Track test trends over time

---

## Quick Reference

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| API Test | `*.api.spec.js` | `users.api.spec.js` |
| UI Test | `*.spec.js` | `login.spec.js` |
| Page Object | `*.page.js` | `login.page.js` |
| Component | `*.component.js` | `header.component.js` |
| Utility | `*.js` | `api-client.js` |
| Fixture | `*.fixture.js` | `auth.fixture.js` |
| Config | `*.config.js` | `environment.config.js` |

### Import Patterns

```javascript
// Base test with fixtures
const { test, expect } = require('../fixtures/base-test');

// Environment config
const { env } = require('../config/environment.config');

// Utilities
const logger = require('../utils/logger');
const { APIClient } = require('../utils/api-client');

// Page objects
const { LoginPage } = require('../pages/login.page');

// Database
const { createDbClient } = require('../utils/database');
```

---

## Troubleshooting Framework Issues

### Issue: Fixture not available in test

**Problem**: `apiClient is not defined`

**Solution**: Ensure you're importing from `fixtures/base-test.js`:
```javascript
const { test } = require('../fixtures/base-test');
```

### Issue: Environment variables not loading

**Problem**: `process.env.BASE_URL is undefined`

**Solutions**:
1. Check `.env.{environment}` file exists in `config/`
2. Verify `TEST_ENV` is set correctly
3. Ensure `dotenv` is configured in `playwright.config.js`

### Issue: Database connection fails

**Problem**: `connect ECONNREFUSED 127.0.0.1:5432`

**Solutions**:
1. Verify database is running
2. Check connection details in `.env` file
3. Ensure database accepts connections from test runner

### Issue: Page object methods not working

**Problem**: `this.page.fill is not a function`

**Solution**: Ensure page object extends `BasePage` and page is passed to constructor

---

## Framework Maintenance

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update all packages
npm update

# Update Playwright browsers
npm run install:browsers
```

### Adding New Utilities

1. Create file in `utils/` folder
2. Export functions/classes
3. Document usage
4. Add tests if complex
5. Update this reference guide

### Adding New Fixtures

1. Edit `fixtures/base-test.js`
2. Add fixture definition
3. Document fixture
4. Update tests to use new fixture

### Adding New Page Objects

1. Create file in `pages/` folder
2. Extend `BasePage`
3. Define locators
4. Implement methods
5. Use in tests

---

## Summary

This framework provides a complete testing solution with:

✅ **Multiple test types** (UI, API, Mobile, Visual, Integrated, No-Code)  
✅ **Page Object Model** for maintainable UI tests  
✅ **Custom fixtures** for easy setup/teardown  
✅ **Database integration** (PostgreSQL, MongoDB)  
✅ **Comprehensive reporting** (HTML, Allure, JSON, JUnit)  
✅ **Logging** with Winston  
✅ **Environment management** for dev/staging/prod  
✅ **CI/CD ready** with Docker and GitLab CI  
✅ **Code quality tools** (ESLint, Prettier)  
✅ **No-code testing** for non-developers  

**For setup instructions, see**: `docs/SETUP_AND_GETTING_STARTED.md`  
**For architecture details, see**: `docs/ARCHITECTURE.md`

---

**Last Updated**: January 2026  
**Framework Version**: 1.0.0  
**Playwright Version**: 1.40.0+