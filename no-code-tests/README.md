# No-Code Test Suites

This directory contains all no-code test definitions written in YAML/JSON format.

## 📁 Directory Structure

```
no-code-tests/
├── api/                          # API test suites
│   ├── login-api.yaml           # Login endpoint tests
│   ├── user-management.yaml     # User CRUD operations
│   ├── data-driven-login.yaml   # Data-driven login tests
│   ├── advanced-examples.yaml   # All assertion types demo
│   └── login-api.json          # JSON format example
└── ui/                          # UI test suites (future)
```

## 🚀 Running Tests

### Run All Tests
```bash
npm run test:nocode
```

### Run Specific Directory
```bash
npm run test:nocode -- --path ./no-code-tests/api
```

### Run Specific File
```bash
npm run test:nocode -- --file ./no-code-tests/api/login-api.yaml
```

## 📝 Available Test Suites

### 1. login-api.yaml
Basic login API testing demonstrating:
- Successful login
- Failed login scenarios
- Variable extraction
- Multiple assertion types

### 2. user-management.yaml
Complete CRUD operations showing:
- Creating users
- Updating users
- Using extracted variables
- Request method modifications

### 3. data-driven-login.yaml
Data-driven testing example:
- Reads test data from CSV
- Parameterized test execution
- Multiple scenarios with one test definition

### 4. advanced-examples.yaml
Comprehensive assertion showcase:
- All 7 assertion types
- JSON schema validation
- Header validation
- Regex patterns
- Variable extraction

### 5. login-api.json
JSON format alternative to YAML:
- Same functionality as YAML
- Use if you prefer JSON syntax

## 🎯 Creating Your Own Tests

1. **Copy an example file**
2. **Replace the cURL command** with your API endpoint
3. **Modify test cases** to match your requirements
4. **Add assertions** based on expected behavior
5. **Run and iterate**

## 📚 Documentation

- [Complete Guide](../../docs/NO_CODE_FRAMEWORK_GUIDE.md)
- [Quick Start](../../docs/QUICKSTART.md)

## 💡 Tips

- Start with simple assertions
- Use descriptive test names
- Add descriptions to document intent
- Extract variables for test chaining
- Use data-driven tests for similar scenarios
- Test both success and failure cases

## 🔗 Related Files

- Test Data: `../test-data/`
- Documentation: `../docs/`
- Framework Code: `../no-code-runner/`