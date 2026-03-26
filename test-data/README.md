# No-Code Test Data

This directory contains test data files for data-driven testing.

## 📁 Supported Formats

- **CSV** - Comma-separated values
- **JSON** - JSON arrays of objects

## 📄 Available Data Files

### login-data.csv
Sample login credentials for testing different scenarios:
- Valid credentials
- Invalid credentials
- Missing fields
- Edge cases

## 🎯 Using Data Files in Tests

### CSV Example

**Data file (test-data/users.csv):**
```csv
name,email,expected_status
John Doe,john@test.com,201
Jane Smith,jane@test.com,201
```

**Test file:**
```yaml
data_driven:
  source: ./test-data/users.csv
  format: csv

test_cases:
  - name: Create user
    modify_request:
      body:
        name: "{{name}}"
        email: "{{email}}"
    assertions:
      - type: status_code
        expected: "{{expected_status}}"
```

### JSON Example

**Data file (test-data/users.json):**
```json
[
  {
    "name": "John Doe",
    "email": "john@test.com",
    "expected_status": 201
  }
]
```

**Test file:**
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
    assertions:
      - type: status_code
        expected: "{{expected_status}}"
```

## 💡 Tips

1. **Column Names** - Use descriptive names that match your test needs
2. **Expected Values** - Include expected status codes, error messages, etc.
3. **Data Types** - CSV treats everything as strings; JSON preserves types
4. **Null Values** - Use empty cells in CSV or `null` in JSON
5. **Organization** - Group related test data together

## 📚 Creating Your Own Data Files

1. Identify test scenarios with similar structure
2. Extract variable data into columns/fields
3. Create CSV/JSON file with test data
4. Reference in your test suite's `data_driven` section
5. Use `{{column_name}}` syntax to inject data

## 🔗 Related

- [Data-Driven Testing Guide](../docs/NO_CODE_FRAMEWORK_GUIDE.md#-data-driven-testing)
- [Example Tests](../no-code-tests/api/)