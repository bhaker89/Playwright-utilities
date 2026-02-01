# No-Code Automation Framework

A powerful no-code automation framework built on top of Playwright that enables QA teams to write comprehensive API and UI tests without any coding knowledge.

## 🚀 Features

### API Testing
- ✅ **Zero Code Required** - Write tests in simple YAML/JSON files
- ✅ **cURL Support** - Copy-paste cURL commands from Postman/Browser DevTools
- ✅ **Rich Assertions** - 7+ assertion types for comprehensive validation
- ✅ **Variable Extraction** - Extract and reuse data between tests
- ✅ **Data-Driven Testing** - Parameterize tests with CSV/JSON files
- ✅ **Request Modification** - Easily modify requests per test case
- ✅ **Schema Validation** - Validate responses against JSON schemas
- ✅ **Performance Testing** - Built-in response time assertions

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Testing Guide](#api-testing-guide)
- [Assertion Types](#assertion-types)
- [Variable Management](#variable-management)
- [Data-Driven Testing](#data-driven-testing)
- [Examples](#examples)
- [CLI Usage](#cli-usage)

## 🔧 Installation

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Setup

1. **Install dependencies** (if not already done):
```bash
npm install
```

2. **Fix npm permissions** (if you encounter permission errors):
```bash
sudo chown -R $(whoami) ~/.npm
npm cache clean --force
npm install
```

3. **Verify installation**:
```bash
npm run test:nocode -- --help
```

## 🎯 Quick Start

### 1. Create Your First API Test

Create a file `no-code-tests/api/my-first-test.yaml`:

```yaml
name: My First API Test
description: A simple API test example

# Paste your cURL command here (from Postman/Browser)
curl: |
  curl 'https://reqres.in/api/users/2' \
    -H 'Accept: application/json'

test_cases:
  - name: Verify user data
    assertions:
      - type: status_code
        expected: 200
      - type: json_path
        path: $.data.email
        exists: true
      - type: response_time
        max_ms: 2000
```

### 2. Run Your Test

```bash
npm run test:nocode
```

That's it! Your test will execute and show results.

## 📖 API Testing Guide

### Test File Structure

Every API test file follows this structure:

```yaml
name: Test Suite Name
description: Optional description

# Base cURL command (copied from Postman/Browser DevTools)
curl: |
  curl 'https://api.example.com/endpoint' \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer token' \
    --data-raw '{"key":"value"}'

# Optional: Base request configuration
base_request:
  timeout: 5000
  headers:
    Custom-Header: value

# Test cases
test_cases:
  - name: Test Case 1
    description: Optional description
    assertions:
      - type: status_code
        expected: 200
    
  - name: Test Case 2
    modify_request:
      body:
        key: "different value"
    assertions:
      - type: status_code
        expected: 400
```

### Modifying Requests

You can modify the base cURL request for each test case:

```yaml
test_cases:
  - name: Test with modified data
    modify_request:
      # Change HTTP method
      method: PUT
      
      # Add/override headers
      headers:
        Authorization: Bearer new_token
        Custom-Header: value
      
      # Modify body (deep merge for objects)
      body:
        field1: "new value"
        field2: null  # Remove this field
      
      # Modify query parameters
      queryParams:
        page: "2"
        limit: "50"
    assertions:
      - type: status_code
        expected: 200
```

## 🎯 Assertion Types

### 1. Status Code

Check HTTP response status:

```yaml
assertions:
  - type: status_code
    expected: 200
```

### 2. JSON Path

Query and validate JSON responses using JSONPath:

```yaml
assertions:
  # Check if path exists
  - type: json_path
    path: $.token
    exists: true
  
  # Check exact value
  - type: json_path
    path: $.user.email
    expected: test@example.com
  
  # Check if contains text
  - type: json_path
    path: $.error.message
    contains: "Invalid credentials"
```

**JSONPath Examples:**
- `$.token` - Root level field
- `$.user.email` - Nested field
- `$.data[0].name` - First item in array
- `$.items[*].price` - All prices in items array

### 3. Response Time

Performance assertions:

```yaml
assertions:
  - type: response_time
    max_ms: 2000  # Must respond within 2 seconds
```

### 4. Header

Validate response headers:

```yaml
assertions:
  # Check header value
  - type: header
    header_name: Content-Type
    expected: application/json
  
  # Check if header exists
  - type: header
    header_name: X-Custom-Header
    exists: true
  
  # Check if header contains text
  - type: header
    header_name: Set-Cookie
    contains: session_id
```

### 5. Schema Validation

Validate against JSON Schema:

```yaml
assertions:
  - type: schema
    schema:
      type: object
      required: ["id", "email", "name"]
      properties:
        id:
          type: number
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
```

### 6. Contains

Check if response contains text:

```yaml
assertions:
  - type: contains
    contains: "success"
```

### 7. Regex

Match against regular expression:

```yaml
assertions:
  - type: regex
    pattern: "^\\d{3}-\\d{3}-\\d{4}$"  # Phone number format
```

## 🔄 Variable Management

Extract data from responses and use in subsequent requests:

### Extracting Variables

```yaml
test_cases:
  - name: Login and extract token
    assertions:
      - type: status_code
        expected: 200
    extract_variables:
      # Extract from JSON path
      - name: auth_token
        source: json_path
        path: $.token
      
      # Extract from header
      - name: session_id
        source: header
        header_name: Set-Cookie
      
      # Extract entire response
      - name: full_response
        source: response
```

### Using Variables

Use extracted variables in subsequent test cases with `${variable_name}` or `{{variable_name}}`:

```yaml
test_cases:
  - name: Login
    extract_variables:
      - name: auth_token
        source: json_path
        path: $.token
  
  - name: Access protected resource
    modify_request:
      headers:
        Authorization: "Bearer ${auth_token}"
    assertions:
      - type: status_code
        expected: 200
```

### Setup Phase

Extract variables before running any test cases:

```yaml
name: API Tests with Setup

curl: |
  curl 'https://api.example.com/auth/login' \
    --data '{"username":"admin","password":"pass"}'

setup:
  extract_variables:
    - name: admin_token
      source: json_path
      path: $.token

test_cases:
  - name: Use admin token
    modify_request:
      headers:
        Authorization: "Bearer ${admin_token}"
    assertions:
      - type: status_code
        expected: 200
```

## 📊 Data-Driven Testing

Run the same test with multiple data sets:

### CSV Data Source

**File: test-data/users.csv**
```csv
name,email,age,expected_status
John Doe,john@test.com,25,201
Jane Smith,jane@test.com,30,201
Invalid User,,invalid,400
```

**Test File:**
```yaml
name: Data-Driven User Creation

curl: |
  curl 'https://api.example.com/users' \
    -X POST \
    -H 'Content-Type: application/json' \
    --data-raw '{"name":"","email":"","age":0}'

data_driven:
  source: ./test-data/users.csv
  format: csv

test_cases:
  - name: Create user with CSV data
    modify_request:
      body:
        name: "{{name}}"
        email: "{{email}}"
        age: "{{age}}"
    assertions:
      - type: status_code
        expected: "{{expected_status}}"
```

### JSON Data Source

**File: test-data/users.json**
```json
[
  {
    "name": "John Doe",
    "email": "john@test.com",
    "age": 25,
    "expected_status": 201
  },
  {
    "name": "Jane Smith",
    "email": "jane@test.com",
    "age": 30,
    "expected_status": 201
  }
]
```

**Test File:**
```yaml
data_driven:
  source: ./test-data/users.json
  format: json

test_cases:
  - name: Create user
    modify_request:
      body:
        name: "{{name}}"
        email: "{{email}}"
        age: "{{age}}"
    assertions:
      - type: status_code
        expected: "{{expected_status}}"
```

## 💻 CLI Usage

### Basic Commands

```bash
# Run all tests from default directory
npm run test:nocode

# Run all API tests
npm run test:nocode:api

# Run tests from specific directory
npm run test:nocode -- --path ./my-tests

# Run specific test file
npm run test:nocode -- --file ./no-code-tests/api/login.yaml

# Show help
npm run test:nocode -- --help
```

### Direct CLI Usage

```bash
# Using ts-node
npx ts-node no-code-runner/cli.ts --path ./no-code-tests/api

# After building TypeScript
node dist/no-code-runner/cli.js --path ./no-code-tests/api
```

### CLI Options

```
Options:
  --type, -t    Type of tests to run (api, ui, all)  [default: "all"]
  --path, -p    Path to test directory               [default: "./no-code-tests/api"]
  --file, -f    Path to specific test file
  --help, -h    Show help
```

## 📚 Complete Examples

### Example 1: Login Flow with Token Extraction

```yaml
name: Complete Login Flow

curl: |
  curl 'https://reqres.in/api/login' \
    -H 'Content-Type: application/json' \
    --data-raw '{"email":"eve.holt@reqres.in","password":"cityslicka"}'

test_cases:
  - name: Successful login
    assertions:
      - type: status_code
        expected: 200
      - type: json_path
        path: $.token
        exists: true
      - type: response_time
        max_ms: 2000
    extract_variables:
      - name: auth_token
        source: json_path
        path: $.token

  - name: Login with wrong password
    modify_request:
      body:
        password: "wrongpassword"
    assertions:
      - type: status_code
        expected: 400
      - type: json_path
        path: $.error
        exists: true
```

### Example 2: CRUD Operations with Variables

```yaml
name: User CRUD Operations

curl: |
  curl 'https://reqres.in/api/users' \
    -X POST \
    -H 'Content-Type: application/json' \
    --data-raw '{"name":"Test User","job":"Tester"}'

test_cases:
  - name: Create user
    assertions:
      - type: status_code
        expected: 201
      - type: json_path
        path: $.id
        exists: true
    extract_variables:
      - name: user_id
        source: json_path
        path: $.id

  - name: Update user
    modify_request:
      method: PUT
      body:
        name: "Updated User"
        job: "Senior Tester"
    assertions:
      - type: status_code
        expected: 200
      - type: json_path
        path: $.name
        expected: "Updated User"

  - name: Delete user
    modify_request:
      method: DELETE
      body: null
    assertions:
      - type: status_code
        expected: 204
```

## 🎓 Best Practices

1. **Organize Tests by Feature**
   ```
   no-code-tests/
   ├── api/
   │   ├── auth/
   │   │   ├── login.yaml
   │   │   └── logout.yaml
   │   ├── users/
   │   │   ├── create-user.yaml
   │   │   └── update-user.yaml
   ```

2. **Use Descriptive Names**
   - Suite names: "User Authentication Tests"
   - Test names: "Should return 401 when password is incorrect"

3. **Add Descriptions**
   - Help team members understand what each test does
   - Document expected behavior

4. **Use Data-Driven Tests for Similar Scenarios**
   - Reduces duplication
   - Easier to maintain test data

5. **Extract Variables for Chained Requests**
   - Login → Extract token → Use in authenticated requests

6. **Add Response Time Assertions**
   - Monitor API performance
   - Catch performance regressions early

## 🐛 Troubleshooting

### Permission Errors During npm install

```bash
sudo chown -R $(whoami) ~/.npm
npm cache clean --force
npm install
```

### YAML Syntax Errors

- Use a YAML validator or IDE with YAML support
- Check indentation (use spaces, not tabs)
- Ensure proper string quoting

### Variable Not Found

- Verify variable was extracted in previous test
- Check variable name spelling
- Ensure test order (extraction before usage)

### JSONPath Not Working

- Test your JSONPath at [jsonpath.com](https://jsonpath.com)
- Verify JSON structure in response
- Use `$.` prefix for root level

## 📞 Support

For issues, questions, or contributions:
- Check example files in `no-code-tests/api/`
- Review this documentation
- Check test data examples in `test-data/`

## 🎉 Success!

You now have a complete no-code automation framework! Start by:
1. Copying a cURL command from Postman
2. Creating a YAML file
3. Adding assertions
4. Running your test

Happy Testing! 🚀