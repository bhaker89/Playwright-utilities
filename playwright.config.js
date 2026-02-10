const { defineConfig, devices } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const environment = process.env.TEST_ENV || 'stag';
dotenv.config({ path: path.resolve(__dirname, `config/.env.${environment}`) });

/**
 * Playwright Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./global-setup'),

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 4 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      detail: true,
      suiteTitle: true
    }]
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'https://example.com',

    /* API base URL */
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording */
    video: process.env.CI ? 'retain-on-failure' : 'off',

    /* Maximum time each action such as `click()` can take */
    actionTimeout: 15000,

    /* Maximum time page navigation can take */
    navigationTimeout: 30000,
  },

  /* Global timeout for each test */
  timeout: 60000,

  /* Maximum time for the whole test run */
  globalTimeout: process.env.CI ? 3600000 : undefined,

  /* Expect timeout */
  expect: {
    timeout: 10000,
    toMatchSnapshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },

  /* Configure projects for major browsers */
  projects: [
    // API Testing Project (no browser needed) - runs only once
    {
      name: 'api',
      testMatch: /.*\/(api|legacy)\/.*\.spec\.js/,  // Matches files in api/ or legacy/ directories
      use: {
        baseURL: process.env.API_BASE_URL || 'https://api.example.com',
      },
    },

    // Desktop Browsers - excludes API tests
    {
      name: 'chromium',
      testIgnore: /.*\/api\/.*\.spec\.js/,  // Ignore API tests for browser projects
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'firefox',
      testIgnore: /.*\/api\/.*\.spec\.js/,
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'webkit',
      testIgnore: /.*\/api\/.*\.spec\.js/,
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'edge',
      testIgnore: /.*\/api\/.*\.spec\.js/,
      use: {
        ...devices['Desktop Edge'],
        viewport: { width: 1920, height: 1080 },
        channel: 'msedge'
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      testIgnore: /.*\/api\/.*\.spec\.js/,
      use: {
        ...devices['Pixel 5'],
      },
    },

    {
      name: 'Mobile Safari',
      testIgnore: /.*\/api\/.*\.spec\.js/,
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',
});