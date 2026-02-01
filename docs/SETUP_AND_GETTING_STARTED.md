# Setup and Getting Started Guide

> **Quick Start Guide for New Team Members**  
> This document will help you set up the Playwright Automation Framework and run your first tests.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Environment Configuration](#environment-configuration)
4. [Running Tests](#running-tests)
5. [Viewing Test Reports](#viewing-test-reports)
6. [Troubleshooting](#troubleshooting)
7. [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

### 1. Node.js (Required)
- **Version**: Node.js v16 or higher (v18 recommended)
- **Check if installed**:
  ```bash
  node --version
  ```
- **Download**: If not installed, download from [nodejs.org](https://nodejs.org/)

### 2. npm (Node Package Manager)
- **Comes with Node.js** - Usually installed automatically with Node.js
- **Check if installed**:
  ```bash
  npm --version
  ```

### 3. Git (Optional but Recommended)
- **Check if installed**:
  ```bash
  git --version
  ```
- **Download**: [git-scm.com](https://git-scm.com/)

### 4. Code Editor (Recommended)
- **Visual Studio Code** - [Download VS Code](https://code.visualstudio.com/)
- Install the following VS Code extensions:
  - Playwright Test for VSCode
  - ESLint
  - Prettier

### 5. System Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Ubuntu 20.04+
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 2GB free space

---

## Installation Steps

### Step 1: Clone or Download the Repository

**If you have Git:**
```bash
git clone <repository-url>
cd Playwright-Automation
```

**If you don't have Git:**
- Download the project ZIP file
- Extract it to your desired location
- Open terminal/command prompt in that folder

### Step 2: Install Project Dependencies

Navigate to the project root directory and run:

```bash
npm install
```

**What this does:**
- Installs all required npm packages
- Downloads Playwright test framework
- Sets up development dependencies like ESLint and Prettier

**Expected output:**
```
added 234 packages, and audited 235 packages in 45s
```

### Step 3: Install Playwright Browsers

Playwright needs browser binaries to run tests. Install them with:

```bash
npm run install:browsers
```

Or directly:
```bash
npx playwright install --with-deps
```

**What this installs:**
- Chromium
- Firefox
- WebKit (Safari)
- System dependencies required by browsers

**Expected output:**
```
Downloading browsers...
  - chromium v1095 (100MB)
  - firefox v1419 (75MB)
  - webkit v1867 (65MB)
```

### Step 4: Verify Installation

Run a quick test to verify everything is set up:

```bash
npm test -- tests/api/http-status.api.spec.js
```

If you see tests running, congratulations! Your setup is complete. ✅

---

## Environment Configuration

The framework supports multiple environments (dev, staging, production). You need to configure environment-specific variables.

### Understanding Environments

The framework uses `.env` files to manage different environments:
- **`.env.dev`** - Development environment (default)
- **`.env.staging`** - Staging/QA environment
- **`.env.prod`** - Production environment

### Step 1: Create Environment Files

Navigate to the `config/` folder and create your environment files:

```bash
cd config
```

**For Development (`.env.dev`):**
```env
# Base URLs
BASE_URL=https://dev.example.com
UI_BASE_URL=https://dev.example.com
API_BASE_URL=https://api-dev.example.com

# Authentication
AUTH_USERNAME=testuser
AUTH_PASSWORD=testpassword
API_KEY=your-dev-api-key-here

# Database - PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=test_db_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_SSL=false

# Database - MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB=test_db_dev

# Order Nexus (if applicable)
ORDER_NEXUS_BASE_URL=https://api-dev.example.com
STAG_ORDER_NEXUS_TOKEN=your-token-here
ORDER_NEXUS_API_VERSION=v1
```

**For Staging (`.env.staging`):**
```env
BASE_URL=https://staging.example.com
UI_BASE_URL=https://staging.example.com
API_BASE_URL=https://api-staging.example.com
# ... add other staging-specific values
```

**For Production (`.env.prod`):**
```env
BASE_URL=https://example.com
UI_BASE_URL=https://example.com
API_BASE_URL=https://api.example.com
# ... add other production values
```

### Step 2: Set Active Environment

**Default:** The framework uses `dev` environment by default.

**To switch environments:**

```bash
# Run tests in staging environment
TEST_ENV=staging npm test

# Run tests in production environment
TEST_ENV=prod npm test
```

**Windows (Command Prompt):**
```cmd
set TEST_ENV=staging && npm test
```

**Windows (PowerShell):**
```powershell
$env:TEST_ENV="staging"; npm test
```

---

## Running Tests

### Basic Test Execution

#### Run All Tests
```bash
npm test
```

#### Run Specific Test Types

**API Tests Only:**
```bash
npm run test:api
```

**UI Tests Only:**
```bash
npm run test:ui
```

**Mobile Tests:**
```bash
npm run test:mobile
```

**Visual Regression Tests:**
```bash
npm run test:visual
```

**Integrated Tests:**
```bash
npm run test:integrated
```

**No-Code Tests (YAML/JSON based):**
```bash
npm run test:nocode
```

### Running Tests with Browser Visible

By default, tests run in headless mode (no browser window). To see the browser:

```bash
npm run test:headed
```

### Debug Mode

Run tests in debug mode with Playwright Inspector:

```bash
npm run test:debug
```

This opens the Playwright Inspector where you can:
- Step through test actions
- Inspect locators
- View console logs
- Record new actions

### Run Tests on Specific Browsers

**Chromium (Chrome/Edge):**
```bash
npm run test:chrome
```

**Firefox:**
```bash
npm run test:firefox
```

**WebKit (Safari):**
```bash
npm run test:safari
```

**All Browsers:**
```bash
npm run test:all-browsers
```

### Run Specific Test Files

**Single test file:**
```bash
npx playwright test tests/api/users.api.spec.js
```

**Multiple files by pattern:**
```bash
npx playwright test tests/ui/
```

**By test name:**
```bash
npx playwright test -g "login"
```

### Advanced Test Execution

**Run tests in parallel (4 workers):**
```bash
npm run test:parallel
```

**Custom number of workers:**
```bash
npx playwright test --workers=2
```

**Retry failed tests:**
```bash
npx playwright test --retries=2
```

**Run tests with specific tag:**
```bash
npx playwright test --grep @smoke
```

**Exclude tests with tag:**
```bash
npx playwright test --grep-invert @slow
```

---

## Viewing Test Reports

### HTML Report (Default)

After tests complete, view the HTML report:

```bash
npm run report
```

This opens an interactive HTML report in your browser showing:
- Test results summary
- Pass/fail status for each test
- Error messages and stack traces
- Screenshots (for failed tests)
- Videos (if enabled)

### Allure Report (Advanced)

Generate and view detailed Allure reports:

```bash
npm run report:allure
```

**Features:**
- Beautiful, detailed reporting
- Test history and trends
- Categories and suites
- Attachments (screenshots, videos, logs)

### JSON Report

JSON reports are automatically generated at:
```
test-results/results.json
```

View with any JSON viewer or use in CI/CD pipelines.

### JUnit XML Report

JUnit XML reports are generated at:
```
test-results/junit.xml
```

Useful for Jenkins, GitLab CI, and other CI/CD tools.

### Console Logs

View detailed console logs:
```bash
cat logs/test-execution.log
```

Logs include:
- Test execution details
- API request/response logs
- Database queries
- Custom log messages

---

## Troubleshooting

### Issue 1: `npm install` fails with permission errors

**Error:**
```
EACCES: permission denied
```

**Solution (Mac/Linux):**
```bash
sudo npm install
```

**Better Solution (avoid sudo):**
```bash
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
npm install
```

### Issue 2: Browser installation fails

**Error:**
```
Failed to download browser
```

**Solutions:**
1. Check internet connection
2. Clear npm cache:
   ```bash
   npm cache clean --force
   npm run install:browsers
   ```
3. Manual installation:
   ```bash
   npx playwright install chromium
   npx playwright install firefox
   npx playwright install webkit
   ```

### Issue 3: Tests fail with "Connection refused"

**Error:**
```
connect ECONNREFUSED 127.0.0.1:3000
```

**Solutions:**
1. Verify the application is running
2. Check the `BASE_URL` in your `.env` file
3. Ensure firewall isn't blocking connections
4. Try with a different environment

### Issue 4: "Port already in use" error

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

**Mac/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Windows:**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue 5: Module not found errors

**Error:**
```
Error: Cannot find module '@playwright/test'
```

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue 6: Permission denied when running scripts

**Mac/Linux:**
```bash
chmod +x scripts/*.sh
```

### Issue 7: Tests timeout

**Solution:**
- Increase timeout in `playwright.config.js`
- Check network connectivity
- Verify environment URLs are accessible

---

## Best Practices

### 1. **Always Run Tests Before Committing Code**
```bash
npm test
```

### 2. **Use Headed Mode When Debugging**
```bash
npm run test:headed
```

### 3. **Check Reports After Test Runs**
```bash
npm run report
```

### 4. **Keep Dependencies Updated**
```bash
npm update
npm run install:browsers
```

### 5. **Clean Reports Regularly**
```bash
npm run clean
```

### 6. **Use Correct Environment**
```bash
TEST_ENV=staging npm test
```

---

## Next Steps

### For Beginners
1. ✅ Complete setup (you're here!)
2. 📖 Read `docs/FRAMEWORK_REFERENCE.md` to understand the framework structure
3. 🧪 Run a simple API test: `npm run test:api`
4. 🌐 Run a UI test: `npm run test:ui -- --headed`
5. 📊 View test reports: `npm run report`

### For Intermediate Users
1. 📚 Study `docs/ARCHITECTURE.md` for detailed architecture
2. ✍️ Write your first test in `tests/` folder
3. 🔧 Customize fixtures in `fixtures/base-test.js`
4. 🗄️ Learn database testing with examples in `tests/integrated/`
5. 📸 Try visual regression testing: `npm run test:visual`

### For Advanced Users
1. 🔌 Create custom utilities in `utils/` folder
2. 🏗️ Build reusable page objects in `pages/`
3. 📄 Create no-code tests with YAML in `no-code-tests/`
4. 🔄 Set up CI/CD pipeline with `.gitlab-ci.yml`
5. 🎨 Customize reporters in `utils/custom-reporter.js`

---

## Quick Reference

### Most Used Commands

```bash
# Install everything
npm install && npm run install:browsers

# Run all tests
npm test

# Run API tests
npm run test:api

# Run UI tests with visible browser
npm run test:headed

# Debug a specific test
npx playwright test tests/ui/login.spec.js --debug

# View report
npm run report

# Clean old reports
npm run clean

# Format code
npm run format

# Lint code
npm run lint
```

---

## Getting Help

### Documentation
- **Framework Reference**: `docs/FRAMEWORK_REFERENCE.md`
- **Architecture Details**: `docs/ARCHITECTURE.md`
- **Shared Context Guide**: `docs/SHARED_CONTEXT_QUICK_REFERENCE.md`
- **No-Code Framework**: `docs/NO_CODE_FRAMEWORK_GUIDE.md`

### External Resources
- [Playwright Documentation](https://playwright.dev)
- [Node.js Documentation](https://nodejs.org/docs)
- [JavaScript MDN Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

### Common Issues
- Check `logs/` folder for detailed error logs
- Review test screenshots in `test-results/`
- Check environment variables in `config/.env.*`

---

**Happy Testing! 🚀**

For detailed framework internals and component explanations, see `docs/FRAMEWORK_REFERENCE.md`.