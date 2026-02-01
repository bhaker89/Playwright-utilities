# Playwright Automation Suite - Architecture Documentation

**Version:** 1.0.0  
**Last Updated:** January 30, 2026  
**Framework:** Playwright with TypeScript/JavaScript

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Layers](#architecture-layers)
3. [Request Flow - Code-Based Tests](#request-flow---code-based-tests)
4. [Request Flow - No-Code Tests](#request-flow---no-code-tests)
5. [Core Components](#core-components)
6. [Shared Test Context](#shared-test-context)
7. [Directory Structure](#directory-structure)
8. [Execution Paths](#execution-paths)
9. [Design Patterns](#design-patterns)
10. [Configuration Management](#configuration-management)
11. [Reporting and Logging](#reporting-and-logging)

---

## Overview

The Playwright Automation Suite is an **enterprise-ready testing framework** supporting multiple test types:
- **UI Testing** (Web & Mobile)
- **API Testing** (REST APIs)
- **Integrated Testing** (UI + API combined)
- **Visual Regression Testing**
- **No-Code API Testing** (YAML/JSON driven)

### Key Features

✅ Page Object Model (POM) pattern  
✅ Custom fixtures and hooks  
✅ **Shared Test Context** for state management  
✅ Multi-environment support  
✅ Multi-browser testing  
✅ Database integration (PostgreSQL & MongoDB)  
✅ Comprehensive logging with Winston  
✅ Multiple reporting formats (HTML, JSON, JUnit, Allure)  
✅ No-code test execution engine  

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEST EXECUTION LAYER                      │
│  (Code-based Tests | No-Code YAML/JSON Tests)              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────────┐
│                  FIXTURES & HOOKS LAYER                      │
│  (base-test.ts - Unified fixtures + Shared Context)        │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────────┐
│              SHARED TEST CONTEXT LAYER                       │
│  (shared-test-context.ts - Cross-test state management)    │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────────┐
│                  PAGE OBJECTS & UTILITIES                    │
│  (BasePage | APIClient | SchemaValidator | Logger)         │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────────┐
│               PLAYWRIGHT TEST RUNNER                         │
│  (playwright.config.ts - Core configuration)               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────────┐
│            ENVIRONMENT & CONFIGURATION LAYER                 │
│  (.env files | services.yaml | environment.config.ts)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request Flow - Code-Based Tests

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. INITIATION                                                      │
│     npm run test:ui / test:api / test:integrated                   │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. PLAYWRIGHT CONFIG LOADING                                       │
│     File: playwright.config.ts                                     │
│                                                                     │
│     • Loads environment variables from config/.env.{environment}   │
│     • Sets test directory: ./tests                                 │
│     • Configures reporters (HTML, JSON, JUnit, Allure)            │
│     • Defines browser projects (chromium, firefox, webkit)         │
│     • Sets timeouts, retries, workers                              │
│     • Configures trace, screenshot, video settings                 │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. ENVIRONMENT CONFIGURATION                                       │
│     File: config/environment.config.ts                             │
│                                                                     │
│     loadEnvironment() {                                            │
│       const environment = process.env.TEST_ENV || 'dev';          │
│       dotenv.config({ path: `.env.${environment}` });             │
│       return {                                                     │
│         baseURL, apiBaseURL, uiBaseURL,                           │
│         postgres: { host, port, database, user, password },       │
│         mongodb: { uri, database, options },                      │
│         orderNexusBaseURL, orderNexusToken                        │
│       }                                                            │
│     }                                                              │
│                                                                     │
│     export const env = loadEnvironment();                          │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. TEST DISCOVERY                                                  │
│     Playwright scans: ./tests/**/*.spec.ts                         │
│                                                                     │
│     Test Types:                                                    │
│     ├── UI Tests: tests/ui/*.spec.ts                              │
│     ├── API Tests: tests/api/*.api.spec.ts                        │
│     ├── Mobile Tests: tests/mobile/*.mobile.spec.ts               │
│     ├── Visual Tests: tests/visual/*.visual.spec.ts               │
│     └── Integrated Tests: tests/integrated/*.integrated.spec.ts   │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. TEST FILE IMPORT                                                │
│     Example: tests/ui/login-functionality.spec.ts                  │
│                                                                     │
│     import { test, expect, logger } from '../../fixtures/base-test'│
│     import { LoginPage } from '../../pages/login.page'             │
│     import { AuthHelper } from '../../utils/auth-helper'           │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. FIXTURE INITIALIZATION                                          │
│     File: fixtures/base-test.ts                                    │
│                                                                     │
│     export const test = base.extend<TestFixtures>({               │
│       // Fixture for Page (UI tests)                              │
│       page: async ({ page }, use) => {                            │
│         logger.info('Browser page initialized');                  │
│         await use(page);                                           │
│       },                                                           │
│                                                                     │
│       // Fixture for API Client                                    │
│       apiClient: async ({}, use) => {                             │
│         const client = new APIClient(env.apiBaseURL);             │
│         await client.init();                                       │
│         await use(client);                                         │
│         await client.dispose();                                    │
│       },                                                           │
│                                                                     │
│       // Database fixtures                                         │
│       dbClient: async ({}, use) => {                              │
│         const client = DBClientFactory.create('postgres', env);   │
│         await client.connect();                                    │
│         await use(client);                                         │
│         await client.disconnect();                                 │
│       }                                                            │
│     });                                                            │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. TEST SUITE HOOKS EXECUTION                                      │
│                                                                     │
│     test.beforeAll(() => {                                         │
│       logger.info('🏁 TEST SUITE STARTING');                      │
│     });                                                            │
│                                                                     │
│     test.beforeEach(({ page }) => {                               │
│       loginPage = new LoginPage(page);                            │
│       authHelper = new AuthHelper(page);                          │
│     });                                                            │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  8. TEST EXECUTION - UI TEST FLOW                                   │
│                                                                     │
│     test('Login with valid credentials', async ({ page }) => {    │
│       ┌─────────────────────────────────────────────────┐         │
│       │ 8.1 Page Object Initialization                  │         │
│       │     const loginPage = new LoginPage(page);      │         │
│       │     • BasePage constructor called               │         │
│       │     • Page instance stored                      │         │
│       └────────────┬────────────────────────────────────┘         │
│                    ▼                                               │
│       ┌─────────────────────────────────────────────────┐         │
│       │ 8.2 Navigation (BasePage method)               │         │
│       │     await loginPage.navigate();                 │         │
│       │     • Constructs URL from pageUrl property      │         │
│       │     • page.goto(url)                            │         │
│       │     • waitForLoadState('networkidle')           │         │
│       │     • logger.info('Navigating to...')           │         │
│       └────────────┬────────────────────────────────────┘         │
│                    ▼                                               │
│       ┌─────────────────────────────────────────────────┐         │
│       │ 8.3 Element Interactions (Locators)            │         │
│       │     await loginPage.emailInput.fill('user');    │         │
│       │     • Uses Playwright Locator API              │         │
│       │     • Auto-waiting built-in                     │         │
│       │     • Retries on failure                        │         │
│       └────────────┬────────────────────────────────────┘         │
│                    ▼                                               │
│       ┌─────────────────────────────────────────────────┐         │
│       │ 8.4 Assertions                                  │         │
│       │     await expect(page).toHaveTitle('Dashboard');│         │
│       │     • Built-in Playwright assertions            │         │
│       │     • Auto-waiting for conditions               │         │
│       │     • Detailed error messages on failure        │         │
│       └────────────┬────────────────────────────────────┘         │
│                    ▼                                               │
│       ┌─────────────────────────────────────────────────┐         │
│       │ 8.5 Screenshot on Failure (automatic)           │         │
│       │     • Configured in playwright.config.ts        │         │
│       │     • screenshot: 'only-on-failure'             │         │
│       │     • Saved to test-results/ directory          │         │
│       └─────────────────────────────────────────────────┘         │
│     });                                                            │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  9. TEST EXECUTION - API TEST FLOW                                  │
│                                                                     │
│     test('GET /users', async ({ apiClient }) => {                 │
│       ┌─────────────────────────────────────────────────┐         │
│       │ 9.1 API Client Ready (from fixture)            │         │
│       │     • Already initialized in fixture            │         │
│       │     • Base URL set from env.apiBaseURL          │         │
│       │     • Default headers configured                │         │
│       └────────────┬────────────────────────────────────┘         │
│                    ▼                                               │
│       ┌─────────────────────────────────────────────────┐         │
│       │ 9.2 Request Preparation                         │         │
│       │     File: utils/api-client.ts                   │         │
│       │                                                  │         │
│       │     async get(endpoint, options) {              │         │
│       │       const url = this.buildURL(endpoint);      │         │
│       │       const headers = {                          │         │
│       │         ...this.defaultHeaders,                 │         │
│       │         ...options?.headers                      │         │
│       │       };                                         │         │
│       │       const startTime = Date.now();             │         │
│       └────────────┬────────────────────────────────────┘         │
│                    ▼                                               │
│       ┌─────────────────────────────────────────────────┐         │
│       │ 9.3 Execute Request (Playwright Request)       │         │
│       │       const response = await this.context.get(  │         │
│       │         url, { headers, params }                │         │
│       │       );                                         │         │
│       │     }                                            │         │
│       └────────────┬────────────────────────────────────┘         │
│                    ▼                                               │
│       ┌─────────────────────────────────────────────────┐         │
│       │ 9.4 Response Processing                         │         │
│       │       const responseTime = Date.now() - start;  │         │
│       │       const body = await response.json();       │         │
│       │       logger.info(`Status: ${status}`);         │         │
│       │       return {                                   │         │
│       │         status, statusText, headers, body,      │         │
│       │         responseTime                             │         │
│       │       };                                         │         │
│       └────────────┬────────────────────────────────────┘         │
│                    ▼                                               │
│       ┌─────────────────────────────────────────────────┐         │
│       │ 9.5 Schema Validation (optional)                │         │
│       │     File: utils/schema-validator.ts             │         │
│       │                                                  │         │
│       │     SchemaValidator.validate(response.body, {   │         │
│       │       id: Joi.number().required(),              │         │
│       │       name: Joi.string().required()             │         │
│       │     });                                          │         │
│       └────────────┬────────────────────────────────────┘         │
│                    ▼                                               │
│       ┌─────────────────────────────────────────────────┐         │
│       │ 9.6 Assertions                                  │         │
│       │     expect(response.status).toBe(200);          │         │
│       │     expect(response.responseTime).toBeLessThan( │         │
│       │       3000                                       │         │
│       │     );                                           │         │
│       └─────────────────────────────────────────────────┘         │
│     });                                                            │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  10. TEST EXECUTION - INTEGRATED TEST FLOW                          │
│                                                                     │
│      test('Create via API, verify in UI', async ({ page,          │
│                                                    apiClient }) => { │
│        ┌─────────────────────────────────────────────────┐        │
│        │ 10.1 API Operation                              │        │
│        │      const response = await apiClient.post(     │        │
│        │        '/posts', { title, body }                │        │
│        │      );                                          │        │
│        │      expect(response.status).toBe(201);         │        │
│        │      const id = response.body.id;               │        │
│        └────────────┬────────────────────────────────────┘        │
│                     ▼                                              │
│        ┌─────────────────────────────────────────────────┐        │
│        │ 10.2 UI Navigation                              │        │
│        │      await page.goto(`/posts/${id}`);           │        │
│        │      await page.waitForLoadState('networkidle');│        │
│        └────────────┬────────────────────────────────────┘        │
│                     ▼                                              │
│        ┌─────────────────────────────────────────────────┐        │
│        │ 10.3 UI Verification                            │        │
│        │      await expect(page.locator('.title'))       │        │
│        │        .toContainText(title);                   │        │
│        └────────────┬────────────────────────────────────┘        │
│                     ▼                                              │
│        ┌─────────────────────────────────────────────────┐        │
│        │ 10.4 Database Validation (optional)             │        │
│        │      const dbRecord = await dbClient.query(     │        │
│        │        'SELECT * FROM posts WHERE id = $1', [id]│        │
│        │      );                                          │        │
│        │      expect(dbRecord[0].title).toBe(title);     │        │
│        └─────────────────────────────────────────────────┘        │
│      });                                                           │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  11. CLEANUP & REPORTING                                            │
│                                                                     │
│      test.afterEach(async ({ page }) => {                         │
│        • Screenshot capture (if test failed)                       │
│        • logger.info('Test completed')                             │
│      });                                                           │
│                                                                     │
│      test.afterAll(async () => {                                  │
│        • Fixture cleanup (apiClient.dispose(), db.disconnect())   │
│        • logger.info('Suite completed')                            │
│      });                                                           │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  12. REPORT GENERATION                                              │
│      • HTML Report: playwright-report/index.html                   │
│      • JSON Report: test-results/results.json                      │
│      • JUnit Report: test-results/junit.xml                        │
│      • Allure Report: allure-results/ (view with: npm run report:  │
│        allure)                                                      │
│      • Winston Logs: logs/test-YYYY-MM-DD.log                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow - No-Code Tests

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. INITIATION                                                      │
│     npm run test:nocode                                            │
│     OR                                                              │
│     node no-code-runner/cli.js run tests/api-tests.yaml           │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. CLI ENTRY POINT                                                 │
│     File: no-code-runner/cli.js                                    │
│                                                                     │
│     class CLI {                                                    │
│       constructor() {                                              │
│         this.testRunner = new TestRunner();                        │
│       }                                                            │
│                                                                     │
│       async runCommand(argv) {                                     │
│         const testFilePath = path.resolve(argv.testFile);         │
│         console.log('🚀 No-Code API Test Runner');                │
│         await this.testRunner.runTestSuite(testFilePath);         │
│       }                                                            │
│     }                                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. TEST RUNNER INITIALIZATION                                      │
│     File: no-code-runner/runner/test-runner.js                     │
│                                                                     │
│     class TestRunner {                                             │
│       constructor() {                                              │
│         this.loader = new TestSuiteLoader();                       │
│         this.curlParser = new CurlParser();                        │
│         this.assertionEngine = new AssertionEngine();              │
│         this.variableManager = new VariableManager();              │
│         this.requestModifier = new RequestModifier(                │
│           this.variableManager                                     │
│         );                                                         │
│         this.dataProvider = new DataProvider();                    │
│         this.serviceConfigLoader = new ServiceConfigLoader();      │
│       }                                                            │
│     }                                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. SERVICE CONFIGURATION LOADING                                   │
│     File: no-code-runner/config/service-config-loader.js           │
│                                                                     │
│     await serviceConfigLoader.loadConfig();                        │
│     • Reads config/services.yaml                                   │
│     • Loads service definitions:                                   │
│       {                                                            │
│         nexus: {                                                   │
│           base_url: "${ORDER_NEXUS_BASE_URL}",                    │
│           auth: { type: "bearer", token: "${NEXUS_TOKEN}" },      │
│           headers: { Accept: "application/json" },                │
│           timeout: 30000                                           │
│         }                                                          │
│       }                                                            │
│     • Resolves environment variables                               │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. TEST SUITE LOADING                                              │
│     File: no-code-runner/parsers/test-suite-loader.js              │
│                                                                     │
│     const testSuite = await loader.load(testFilePath);            │
│     ┌───────────────────────────────────────────────────┐         │
│     │ 5.1 File Type Detection                           │         │
│     │     • Check extension (.yaml, .yml, .json)        │         │
│     └────────────┬──────────────────────────────────────┘         │
│                  ▼                                                 │
│     ┌───────────────────────────────────────────────────┐         │
│     │ 5.2 Parse File                                    │         │
│     │     • YAML: js-yaml.load(fileContent)             │         │
│     │     • JSON: JSON.parse(fileContent)               │         │
│     └────────────┬──────────────────────────────────────┘         │
│                  ▼                                                 │
│     ┌───────────────────────────────────────────────────┐         │
│     │ 5.3 Schema Validation (Ajv)                       │         │
│     │     • Validate against JSON schema                │         │
│     │     • Required: name, tests                       │         │
│     │     • Optional: config, description               │         │
│     └────────────┬──────────────────────────────────────┘         │
│                  ▼                                                 │
│     ┌───────────────────────────────────────────────────┐         │
│     │ 5.4 Return Parsed Test Suite                      │         │
│     │     {                                              │         │
│     │       name: "Suite Name",                         │         │
│     │       config: { service: "nexus" },               │         │
│     │       tests: [...]                                │         │
│     │     }                                              │         │
│     └───────────────────────────────────────────────────┘         │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. TEST CASE ITERATION                                             │
│                                                                     │
│     for (const testCase of testSuite.tests) {                     │
│       await runTestCase(testCase, baseUrl, testFilePath, config); │
│     }                                                              │
│                                                                     │
│     • Check if data-driven test                                    │
│     • Route to appropriate execution method                        │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. SINGLE TEST EXECUTION                                           │
│                                                                     │
│     async runSingleTest(testCase, baseUrl, dataRow, rowIndex) {   │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 7.1 Service Configuration Resolution            │       │
│       │     const serviceName = testCase.service ||      │       │
│       │                         config.service;           │       │
│       │     const serviceConfig = serviceConfigLoader    │       │
│       │       .getRequestConfig(serviceName, endpoint);  │       │
│       └────────────┬──────────────────────────────────────┘       │
│                    ▼                                               │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 7.2 API Context Creation                         │       │
│       │     const apiContext = await request.newContext();│       │
│       │     • Playwright APIRequestContext               │       │
│       │     • Isolated for this test                     │       │
│       └────────────┬──────────────────────────────────────┘       │
│                    ▼                                               │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 7.3 Request Configuration                        │       │
│       │     if (testCase.request.curl) {                 │       │
│       │       // Parse cURL command                      │       │
│       │       request_config = curlParser.parse(curl);   │       │
│       │     } else {                                      │       │
│       │       request_config = testCase.request;         │       │
│       │     }                                             │       │
│       └────────────┬──────────────────────────────────────┘       │
│                    ▼                                               │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 7.4 Service Config Merge                         │       │
│       │     if (serviceRequestConfig) {                  │       │
│       │       request_config.url = serviceConfig.url;    │       │
│       │       request_config.headers = {                 │       │
│       │         ...serviceConfig.headers,                │       │
│       │         ...request_config.headers                │       │
│       │       };                                          │       │
│       │       request_config.timeout = serviceConfig     │       │
│       │         .timeout;                                │       │
│       │     }                                             │       │
│       └────────────┬──────────────────────────────────────┘       │
│                    ▼                                               │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 7.5 Request Modification (Variables)             │       │
│       │     File: no-code-runner/engine/request-modifier │       │
│       │                                                   │       │
│       │     if (testCase.request.modify || dataRow) {    │       │
│       │       request_config = requestModifier           │       │
│       │         .modifyRequest(                          │       │
│       │           request_config,                        │       │
│       │           testCase.request.modify,               │       │
│       │           dataRow                                │       │
│       │         );                                        │       │
│       │     }                                             │       │
│       │     • Replace {{variables}} in URL, headers, body│       │
│       │     • Apply data-driven values                   │       │
│       └────────────┬──────────────────────────────────────┘       │
│                    ▼                                               │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 7.6 URL Building & Options Preparation           │       │
│       │     const url = requestModifier.buildUrl(        │       │
│       │       request_config                             │       │
│       │     );                                            │       │
│       │     const options = requestModifier              │       │
│       │       .preparePlaywrightOptions(request_config); │       │
│       │                                                   │       │
│       │     console.log(`Method: ${options.method}`);    │       │
│       │     console.log(`URL: ${url}`);                  │       │
│       │     console.log(`Headers: ${JSON.stringify(...)}`);│     │
│       └────────────┬──────────────────────────────────────┘       │
│                    ▼                                               │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 7.7 Execute Request                              │       │
│       │     const startTime = Date.now();                │       │
│       │     const response = await apiContext.fetch(     │       │
│       │       url, options                               │       │
│       │     );                                            │       │
│       │     const responseTime = Date.now() - startTime; │       │
│       │                                                   │       │
│       │     console.log(`Status: ${response.status()}`); │       │
│       │     console.log(`Time: ${responseTime}ms`);      │       │
│       └────────────┬──────────────────────────────────────┘       │
│                    ▼                                               │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 7.8 Variable Extraction                          │       │
│       │     File: no-code-runner/engine/variable-manager │       │
│       │                                                   │       │
│       │     if (testCase.extract) {                      │       │
│       │       await variableManager.extractVariables(    │       │
│       │         response, testCase.extract               │       │
│       │       );                                          │       │
│       │       // JSONPath extraction                     │       │
│       │       // Store for use in subsequent tests       │       │
│       │     }                                             │       │
│       └────────────┬──────────────────────────────────────┘       │
│                    ▼                                               │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 7.9 Assertion Execution                          │       │
│       │     File: no-code-runner/engine/assertion-engine │       │
│       │                                                   │       │
│       │     if (testCase.assertions) {                   │       │
│       │       const results = await assertionEngine      │       │
│       │         .executeAssertions(                      │       │
│       │           response, testCase.assertions,         │       │
│       │           startTime                              │       │
│       │         );                                        │       │
│       │                                                   │       │
│       │       Assertion Types:                           │       │
│       │       • status_code: response.status === expected│       │
│       │       • response_time: responseTime < max_ms     │       │
│       │       • jsonpath: JSONPath.query(body, path)     │       │
│       │       • schema: Joi.validate(body, schema)       │       │
│       │       • header: headers[key] === expected        │       │
│       │                                                   │       │
│       │       for (const result of results) {            │       │
│       │         const status = result.passed ? '✓' : '✗';│       │
│       │         console.log(`${status}: ${result.msg}`); │       │
│       │         if (!result.passed) throw new Error(...);│       │
│       │       }                                           │       │
│       │     }                                             │       │
│       └────────────┬──────────────────────────────────────┘       │
│                    ▼                                               │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 7.10 Cleanup                                     │       │
│       │      await apiContext.dispose();                 │       │
│       │      console.log('Test completed ✓');            │       │
│       └───────────────────────────────────────────────────┘       │
│     }                                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  8. DATA-DRIVEN TEST EXECUTION                                      │
│                                                                     │
│     async runDataDrivenTest(testCase, baseUrl, testFilePath) {    │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 8.1 Data File Resolution                         │       │
│       │     const testDir = path.dirname(testFilePath);  │       │
│       │     const dataFilePath = path.resolve(           │       │
│       │       testDir, testCase.data_driven.source       │       │
│       │     );                                            │       │
│       └────────────┬──────────────────────────────────────┘       │
│                    ▼                                               │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 8.2 Data Loading                                 │       │
│       │     File: no-code-runner/engine/data-provider    │       │
│       │                                                   │       │
│       │     const testData = await dataProvider          │       │
│       │       .loadData(dataFilePath);                   │       │
│       │     • Supports CSV, JSON files                   │       │
│       │     • Returns array of data objects              │       │
│       └────────────┬──────────────────────────────────────┘       │
│                    ▼                                               │
│       ┌───────────────────────────────────────────────────┐       │
│       │ 8.3 Iterate Through Data Rows                    │       │
│       │     for (let i = 0; i < testData.length; i++) { │       │
│       │       await runSingleTest(                       │       │
│       │         testCase, baseUrl,                       │       │
│       │         testData[i],  // Data row               │       │
│       │         i              // Row index              │       │
│       │       );                                          │       │
│       │     }                                             │       │
│       │     • Each row creates a test iteration          │       │
│       │     • Variables replaced with row values         │       │
│       └───────────────────────────────────────────────────┘       │
│     }                                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  9. REPORTING                                                       │
│                                                                     │
│     console.log('Test Suite Execution Completed');                │
│     • Console output with ✓/✗ indicators                           │
│     • Exit code: 0 (success) or 1 (failure)                       │
└─────────────────────────────────────────────────────────────────────┘
```

### No-Code Test YAML Example

```yaml
name: "User API Tests"
description: "Test suite for user management endpoints"

config:
  service: "nexus"  # References config/services.yaml

tests:
  - name: "Create User"
    description: "Create a new user via POST request"
    request:
      endpoint: "users"  # Combines with service base_url
      method: "POST"
      headers:
        Content-Type: "application/json"
      body:
        name: "{{username}}"
        email: "{{email}}"
    assertions:
      - type: "status_code"
        expected: 201
      - type: "jsonpath"
        path: "$.id"
        exists: true
      - type: "response_time"
        max_ms: 2000
    extract:
      - name: "userId"
        jsonpath: "$.id"
```

---

## Core Components

### 1. Configuration Layer

#### playwright.config.ts
**Purpose:** Core Playwright configuration  
**Responsibilities:**
- Load environment variables
- Configure test directory and file patterns
- Set up reporters (HTML, JSON, JUnit, Allure)
- Define browser projects
- Configure timeouts, retries, parallel execution
- Set screenshot, video, trace options

**Code Snippet:**
```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

#### config/environment.config.ts
**Purpose:** Environment-specific configuration loader  
**Responsibilities:**
- Load `.env.{environment}` files
- Parse environment variables
- Provide typed configuration interface
- Support multiple databases (PostgreSQL, MongoDB)
- Service-specific configurations

**Code Snippet:**
```typescript
export function loadEnvironment(): EnvironmentConfig {
  const environment = process.env.TEST_ENV || 'dev';
  dotenv.config({ path: `.env.${environment}` });
  
  return {
    testEnv: environment,
    baseURL: process.env.BASE_URL,
    apiBaseURL: process.env.API_BASE_URL,
    postgres: {
      host: process.env.POSTGRES_HOST,
      database: process.env.POSTGRES_DB,
      // ...
    },
    mongodb: {
      uri: process.env.MONGO_URI,
      database: process.env.MONGO_DB,
    }
  };
}

export const env = loadEnvironment();
```

#### config/services.yaml
**Purpose:** Service definitions for no-code tests  
**Structure:**
```yaml
services:
  nexus:
    base_url: "${ORDER_NEXUS_BASE_URL}"
    auth:
      type: "bearer"
      token: "${NEXUS_AUTH_TOKEN}"
    headers:
      Accept: "application/json"
    timeout: 30000
```

---

### 2. Fixture Layer

#### fixtures/base-test.ts
**Purpose:** Unified test fixtures for all test types  
**Responsibilities:**
- Extend Playwright's base test
- Provide custom fixtures (apiClient, dbClient, logger, **sharedContext**)
- Implement beforeEach/afterEach hooks
- Automatic screenshot on failure
- Logging integration
- **Automatic context scoping and cleanup**

**Code Snippet:**
```typescript
export const test = base.extend<TestFixtures>({\n  // API Client fixture
  apiClient: async ({}, use) => {
    const client = new APIClient(env.apiBaseURL);
    await client.init();
    logger.info('API client initialized');
    await use(client);
    await client.dispose();
    logger.info('API client disposed');
  },
  
  // Database fixture
  dbClient: async ({}, use) => {
    const client = DBClientFactory.create('postgres', env);
    await client.connect();
    await use(client);
    await client.disconnect();
  },
  
  // Shared Context fixture (NEW)
  sharedContext: async ({}, use, testInfo) => {
    const context = SharedTestContext.getInstance();
    context.setSuiteName(testInfo.titlePath[0]);
    context.setTestName(testInfo.title);
    logger.info(`Shared context initialized for test: ${testInfo.title}`);
    
    await use(context);
    
    // Auto-cleanup test scope after each test
    context.clearScope('test');
    logger.info('Shared context test scope cleared');
  },
});

export { expect } from '@playwright/test';
export { SharedTestContext, ContextHelpers } from '../utils/shared-test-context';
```

**Why One Base Test?**
- **DRY Principle:** No code duplication
- **Flexibility:** Use only what you need
- **Lazy Loading:** Unused fixtures don't affect performance
- **Maintainability:** Update hooks in ONE place
- **Automatic Context Management:** Scoping and cleanup handled automatically

---

### 3. Page Object Model (POM)

#### pages/base.page.ts
**Purpose:** Abstract base class for all page objects  
**Responsibilities:**
- Common page operations (navigate, waitFor, screenshot)
- Locator helpers (getByRole, getByTestId, getByText)
- Navigation management
- Logging integration

**Code Snippet:**
```typescript
export abstract class BasePage {
  protected page: Page;
  protected abstract pageUrl: string;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  async navigate(): Promise<void> {
    logger.info(`Navigating to: ${this.pageUrl}`);
    await this.page.goto(this.pageUrl);
    await this.page.waitForLoadState('networkidle');
  }
  
  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }
  
  protected getByRole(...): Locator { ... }
  protected getByTestId(...): Locator { ... }
}
```

#### pages/login.page.ts
**Purpose:** Login page implementation  
**Structure:**
```typescript
export class LoginPage extends BasePage {
  protected pageUrl = env.uiBaseURL + '/login';
  
  // Locators
  get emailOrMobileInput(): Locator {
    return this.locator('#email-input');
  }
  
  get sendOtpButton(): Locator {
    return this.getByRole('button', { name: 'Send OTP' });
  }
  
  // Actions
  async login(email: string, otp: string): Promise<void> {
    await this.emailOrMobileInput.fill(email);
    await this.sendOtpButton.click();
    await this.otpInput.fill(otp);
    await this.doneButton.click();
  }
}
```

---

### 4. Utility Layer

#### utils/api-client.ts
**Purpose:** Enhanced REST API client  
**Features:**
- Playwright APIRequestContext wrapper
- Request/response logging
- Response time tracking
- Schema validation integration
- Token management
- Multi-service support

**Key Methods:**
```typescript
class APIClient {
  async init(): Promise<void>
  async get(endpoint, options): Promise<APIResponse>
  async post(endpoint, data, options): Promise<APIResponse>
  async put(endpoint, data, options): Promise<APIResponse>
  async delete(endpoint, options): Promise<APIResponse>
  setAuthToken(token, type): void
  setCustomHeaders(headers): void
  setBaseURL(url): void
}
```

**Response Structure:**
```typescript
interface APIResponse<T> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: T;
  responseTime: number;
}
```

#### utils/logger.ts
**Purpose:** Winston-based logging  
**Features:**
- Multiple transports (console, file)
- Log rotation
- Timestamp formatting
- Log levels (info, warn, error, debug)
- Colorized console output

#### utils/schema-validator.ts
**Purpose:** Joi schema validation  
**Usage:**
```typescript
const userSchema = Joi.object({
  id: Joi.number().required(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
});

SchemaValidator.validate(response.body, userSchema);
```

#### utils/database/
**Purpose:** Multi-database support  
**Files:**
- `db-client-factory.ts` - Factory for creating DB clients
- `postgres-client.ts` - PostgreSQL implementation
- `mongo-client.ts` - MongoDB implementation
- `db-assertions.ts` - Database-specific assertions

---

### 5. No-Code Test Engine

#### no-code-runner/cli.js
**Purpose:** Command-line interface  
**Commands:**
- `run <testFile>` - Execute test suite
- `validate <testFile>` - Validate test file syntax

#### no-code-runner/runner/test-runner.js
**Purpose:** Main test execution engine  
**Responsibilities:**
- Load and parse test files
- Execute test cases
- Manage test context
- Report results

#### no-code-runner/parsers/
**Files:**
- `test-suite-loader.js` - Load YAML/JSON test files
- `curl-parser.js` - Convert cURL commands to request config

#### no-code-runner/engine/
**Files:**
- `assertion-engine.js` - Execute assertions
- `variable-manager.js` - Manage test variables
- `request-modifier.js` - Modify requests with variables
- `data-provider.js` - Load test data (CSV, JSON)

#### no-code-runner/config/
**Files:**
- `service-config-loader.js` - Load service configurations

---

## Directory Structure

```
Playwright-Automation/
├── config/
│   ├── .env.dev                    # Development environment variables
│   ├── .env.staging                # Staging environment variables
│   ├── .env.prod                   # Production environment variables
│   ├── environment.config.ts       # Environment configuration loader
│   └── services.yaml               # Service definitions for no-code tests
│
├── fixtures/
│   ├── base-test.ts               # Unified base test with fixtures
│   ├── test-fixtures.ts           # Re-export for compatibility
│   └── auth.fixture.ts            # Authentication fixtures
│
├── pages/
│   ├── base.page.ts               # Base page object class
│   └── login.page.ts              # Login page object
│
├── tests/
│   ├── ui/                        # UI tests
│   │   ├── login-functionality.spec.ts
│   │   └── place-order-flow.spec.ts
│   ├── api/                       # API tests
│   │   ├── users.api.spec.ts
│   │   └── order-nexus.spec.ts
│   ├── mobile/                    # Mobile tests
│   │   └── responsive.mobile.spec.ts
│   ├── visual/                    # Visual regression tests
│   │   └── homepage.visual.spec.ts
│   ├── integrated/                # Integrated UI+API tests
│   │   └── ui-api-integrated.spec.ts
│   └── services/                  # Service-specific tests
│       └── user-service/
│
├── utils/
│   ├── api-client.ts              # API client wrapper
│   ├── logger.ts                  # Winston logger
│   ├── schema-validator.ts        # Joi schema validator
│   ├── test-helpers.ts            # Helper functions
│   ├── auth-helper.ts             # Authentication helpers
│   └── database/
│       ├── db-client-factory.ts
│       ├── postgres-client.ts
│       ├── mongo-client.ts
│       └── db-assertions.ts
│
├── no-code-runner/
│   ├── index.js                   # Main entry point
│   ├── cli.js                     # CLI interface
│   ├── runner/
│   │   └── test-runner.js         # Test execution engine
│   ├── parsers/
│   │   ├── test-suite-loader.js   # YAML/JSON loader
│   │   └── curl-parser.js         # cURL parser
│   ├── engine/
│   │   ├── assertion-engine.js    # Assertion executor
│   │   ├── variable-manager.js    # Variable management
│   │   ├── request-modifier.js    # Request modification
│   │   └── data-provider.js       # Data loading
│   └── config/
│       └── service-config-loader.js
│
├── no-code-tests/
│   └── api/
│       ├── nexus-tests.yaml       # No-code test suite
│       └── _templates/            # Template examples
│
├── test-data/
│   ├── auth-credentials.json      # Test credentials
│   └── users.csv                  # Data-driven test data
│
├── logs/
│   └── test-{date}.log           # Winston logs
│
├── test-results/                  # Test artifacts
│   ├── results.json
│   ├── junit.xml
│   └── screenshots/
│
├── playwright-report/             # HTML report
├── allure-results/                # Allure results
│
├── playwright.config.ts           # Main Playwright config
├── package.json                   # NPM scripts and dependencies
└── tsconfig.json                  # TypeScript configuration
```

---

## Execution Paths

### 1. UI Test Execution

```bash
npm run test:ui
```

**Flow:**
1. NPM script → `playwright test tests/ui`
2. Playwright loads `playwright.config.ts`
3. Environment config loaded from `.env.{TEST_ENV}`
4. Test discovery in `tests/ui/` directory
5. For each test file:
   - Import base-test fixtures
   - Execute beforeAll hooks
   - For each test:
     - Execute beforeEach hooks (initialize fixtures)
     - Create page objects (LoginPage, etc.)
     - Execute test steps
     - Take screenshot on failure
     - Execute afterEach hooks
   - Execute afterAll hooks (cleanup fixtures)
6. Generate reports

### 2. API Test Execution

```bash
npm run test:api
```

**Flow:**
1. NPM script → `playwright test tests/api`
2. Same config loading as UI tests
3. Test discovery in `tests/api/`
4. For each test:
   - Initialize APIClient fixture
   - Execute API requests
   - Validate responses (status, schema, performance)
   - Cleanup APIClient
5. Generate reports

### 3. Integrated Test Execution

```bash
npm run test:integrated
```

**Flow:**
1. Uses BOTH `page` and `apiClient` fixtures
2. API operations + UI verifications in same test
3. Optional database validations
4. Complete end-to-end workflow testing

### 4. No-Code Test Execution

```bash
npm run test:nocode
# OR
node no-code-runner/cli.js run no-code-tests/api/nexus-tests.yaml
```

**Flow:**
1. CLI entry point
2. Load service configurations
3. Parse YAML/JSON test file
4. For each test:
   - Resolve service config
   - Parse/build request
   - Execute via Playwright API
   - Extract variables
   - Execute assertions
5. Console reporting

---

## Design Patterns

### 1. Page Object Model (POM)
**Implementation:** `pages/base.page.ts`, `pages/login.page.ts`  
**Benefits:**
- Separation of test logic and page structure
- Reusable page components
- Maintainable locators

### 2. Fixture Pattern
**Implementation:** `fixtures/base-test.ts`  
**Benefits:**
- Automatic setup/teardown
- Resource management
- Lazy loading
- Dependency injection

### 3. Factory Pattern
**Implementation:** `utils/database/db-client-factory.ts`  
**Benefits:**
- Dynamic client creation
- Abstract database implementation
- Easy to extend for new databases

### 4. Builder Pattern
**Implementation:** `no-code-runner/engine/request-modifier.js`  
**Benefits:**
- Fluent API construction
- Step-by-step request building
- Variable substitution

### 5. Strategy Pattern
**Implementation:** `no-code-runner/engine/assertion-engine.js`  
**Benefits:**
- Multiple assertion types
- Extensible assertion framework
- Runtime strategy selection

---

## Configuration Management

### Environment Hierarchy

```
1. System Environment Variables
   ↓
2. .env.{TEST_ENV} Files
   ↓
3. config/environment.config.ts (Parsing)
   ↓
4. playwright.config.ts (Playwright settings)
   ↓
5. config/services.yaml (Service definitions)
   ↓
6. Test Files (Test-specific config)
```

### Environment Selection

```bash
# Development (default)
npm run test

# Staging
TEST_ENV=staging npm run test

# Production
TEST_ENV=prod npm run test
```

### Service Configuration

**File:** `config/services.yaml`

```yaml
services:
  nexus:
    base_url: "${ORDER_NEXUS_BASE_URL}"
    auth:
      type: "bearer"
      token: "${NEXUS_AUTH_TOKEN}"
    headers:
      Accept: "application/json"
      Content-Type: "application/json"
    timeout: 30000
    endpoints:
      health: "/service/rest/v1/status"
      repositories: "/service/rest/v1/repositories"
```

**Usage in No-Code Tests:**

```yaml
config:
  service: "nexus"

tests:
  - name: "Health Check"
    request:
      endpoint: "health"  # Resolves to full URL
      method: "GET"
```

---

## Reporting and Logging

### 1. HTML Report
**Location:** `playwright-report/index.html`  
**Command:** `npm run report`  
**Features:**
- Test execution timeline
- Screenshots and videos
- Trace viewer
- Filterable results

### 2. Allure Report
**Location:** `allure-results/`  
**Command:** `npm run report:allure`  
**Features:**
- Historical trends
- Test categorization
- Detailed step breakdown
- Attachments

### 3. JUnit Report
**Location:** `test-results/junit.xml`  
**Purpose:** CI/CD integration

### 4. JSON Report
**Location:** `test-results/results.json`  
**Purpose:** Custom processing

### 5. Winston Logs
**Location:** `logs/test-{date}.log`  
**Features:**
- Structured logging
- Multiple log levels
- Log rotation
- Timestamped entries

**Example:**
```
2026-01-30 14:30:15 [INFO]: Navigating to: https://steve.1mg.com
2026-01-30 14:30:16 [INFO]: API client initialized
2026-01-30 14:30:17 [INFO]: Response Status: 200
2026-01-30 14:30:17 [INFO]: Response Time: 245ms
```

---

## Summary

This Playwright automation suite provides a **comprehensive, scalable testing solution** with:

✅ **Multiple test types** (UI, API, Mobile, Visual, Integrated)  
✅ **Dual execution modes** (Code-based + No-code YAML/JSON)  
✅ **Robust architecture** (POM, Fixtures, Utilities)  
✅ **Multi-environment support** (Dev, Staging, Prod)  
✅ **Comprehensive reporting** (HTML, Allure, JUnit, JSON, Logs)  
✅ **Database integration** (PostgreSQL, MongoDB)  
✅ **Service configuration** (Centralized service management)  
✅ **CI/CD ready** (Docker, GitLab CI)  

**Request flow is transparent** from test initiation through configuration loading, fixture setup, test execution, and reporting—making it easy to debug, maintain, and extend.

---

**Document End**