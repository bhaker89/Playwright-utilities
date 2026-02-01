# Running the No-Code API Tests

This guide explains how to run the converted JavaScript-based no-code API test framework.

## Prerequisites

1. Node.js installed (v16 or higher)
2. npm installed
3. All dependencies installed

## Installation

If you haven't installed dependencies yet:

```bash
npm install
```

## Running Tests

### Method 1: Using npm scripts

Run a test suite:
```bash
npm run test:nocode no-code-tests/api/nexus-api-test.yaml
```

Validate a test suite without running:
```bash
npm run test:nocode:validate no-code-tests/api/nexus-api-test.yaml
```

### Method 2: Using CLI directly

Run a test suite:
```bash
node no-code-runner/cli.js run no-code-tests/api/nexus-api-test.yaml
```

Validate a test suite:
```bash
node no-code-runner/cli.js validate no-code-tests/api/nexus-api-test.yaml
```

With verbose output:
```bash
node no-code-runner/cli.js run no-code-tests/api/nexus-api-test.yaml --verbose
```

## Running Nexus API Tests

### Configuration

Before running the Nexus API tests, update the configuration in `no-code-tests/api/nexus-api-test.yaml`:

1. **Update Base URL**: Change `base_url` to your actual Nexus server URL
2. **Add Authentication**: If required, set authorization headers

```yaml
config:
  base_url: "https://your-nexus-server.com"  # Update this

tests:
  - name: "Get Repository List"
    request:
      headers:
        Authorization: "Basic <your-base64-encoded-credentials>"
```

### Run the Nexus Tests

```bash
node no-code-runner/cli.js run no-code-tests/api/nexus-api-test.yaml
```

### Example Output

```
🚀 No-Code API Test Runner
================================================================================
Loading test suite: no-code-tests/api/nexus-api-test.yaml
================================================================================
Suite: Nexus API Test Suite
Description: Test suite for validating Nexus API endpoints
Base URL: https://nexus.example.com
Total Tests: 4
================================================================================

--- Running Test: Health Check - Verify Nexus Service is Running ---
Description: Check if Nexus API is accessible and healthy
Method: GET
URL: https://nexus.example.com/service/rest/v1/status
Sending request...
Response Status: 200
Response Time: 234ms
Executing assertions...
  ✓ PASS: Status code is 200
  ✓ PASS: Response time 234ms is within limit
  ✓ PASS: Header 'Content-Type' contains expected text
Test "Health Check - Verify Nexus Service is Running" completed successfully ✓

================================================================================
Test Suite Execution Completed
================================================================================

✓ All tests completed successfully!
```

## Available Test Files

- `nexus-api-test.yaml` - Nexus API endpoint tests
- `login-api.yaml` - Login API tests with variable extraction
- `authenticated-api.yaml` - Tests with authentication
- `user-management.yaml` - Complete user CRUD operations
- `advanced-examples.yaml` - Advanced features demonstration
- `data-driven-login.yaml` - Data-driven tests with CSV

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Verify the Nexus server URL is correct
2. Check if the server is accessible from your machine
3. Verify firewall/network settings

### Authentication Failures

If you get 401/403 errors:
1. Check your credentials are correct
2. Verify the authorization header format
3. Ensure your account has necessary permissions

### Module Not Found Errors

If you get "Cannot find module" errors:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Framework Features

The no-code framework supports:

- ✅ **7 Assertion Types**: status_code, json_path, response_time, header, schema, contains, regex
- ✅ **Variable Extraction**: Extract and reuse data between tests
- ✅ **Data-Driven Testing**: Use CSV/JSON files for parameterization
- ✅ **Request Modification**: Dynamic headers, body, query params
- ✅ **cURL Support**: Paste cURL commands directly from Postman/DevTools
- ✅ **YAML/JSON Support**: Write tests in either format

## Next Steps

1. Update `nexus-api-test.yaml` with your actual Nexus server URL
2. Add authentication credentials if required
3. Run the tests: `node no-code-runner/cli.js run no-code-tests/api/nexus-api-test.yaml`
4. Check the test results in the console output

For more examples, check other test files in `no-code-tests/api/` directory.