# API Test Templates

This folder contains **template/reference** files for creating new API tests.  
These files demonstrate various patterns and features of the no-code testing framework.

**⚠️ These are NOT meant to be executed as tests** - they use fake/demo APIs.  
Use them as **reference** when creating your own tests.

---

## 📚 Available Templates

### 1. `advanced-examples.yaml` ⭐ REFERENCE
**Purpose:** Comprehensive showcase of all assertion types and features

**What it demonstrates:**
- ✅ All 7 assertion types (status_code, json_path, response_time, header, contains, regex, schema)
- ✅ JSON schema validation
- ✅ Header assertions
- ✅ Regex pattern matching
- ✅ Variable extraction from responses
- ✅ Variable extraction from headers

**Use this when:** You need to see examples of specific assertion types or validation patterns

**Example sections:**
```yaml
- Status code assertions
- JSON path with exact values
- JSON path existence checks
- JSON path with contains
- Response time validation
- Header validation
- Text contains in response
- Regex pattern matching
- JSON schema validation
```

---

### 2. `authenticated-api.yaml` 🔐 TEMPLATE
**Purpose:** Shows how to handle authentication in API tests

**What it demonstrates:**
- ✅ Bearer token authentication
- ✅ Basic authentication patterns
- ✅ Custom header injection
- ✅ Authorization header management
- ✅ Query parameters
- ✅ Request header modifications
- ✅ Variable usage in auth tokens

**Use this when:** You need to test authenticated endpoints

**Key patterns:**
```yaml
# Bearer token
headers:
  Authorization: "Bearer ${auth_token}"

# Custom headers
headers:
  X-Request-ID: "test-request-123"
  Authorization: "Bearer ${auth_token}"

# Query parameters with auth
queryParams:
  page: "2"
  per_page: "6"
```

---

### 3. `data-driven-login.yaml` 📊 TEMPLATE
**Purpose:** Demonstrates data-driven testing using CSV files

**What it demonstrates:**
- ✅ CSV file as data source
- ✅ Parameterized test execution
- ✅ Variable substitution from CSV columns
- ✅ Multiple test scenarios from one definition
- ✅ Dynamic expected values

**Use this when:** You need to run the same test with multiple data sets

**How it works:**
```yaml
# Define data source
data_driven:
  source: ./test-data/login-data.csv
  format: csv

# Use CSV columns as variables
modify_request:
  body:
    email: "{{email}}"          # From CSV column
    password: "{{password}}"    # From CSV column

assertions:
  - type: status_code
    expected: "{{expected_status}}"  # From CSV column
```

**CSV file format:**
```csv
email,password,expected_status
valid@email.com,correct123,200
invalid@email.com,wrong,400
```

---

## 🎯 How to Use These Templates

### Step 1: Choose the Right Template
- Need auth examples? → Use `authenticated-api.yaml`
- Need assertion examples? → Use `advanced-examples.yaml`
- Need data-driven tests? → Use `data-driven-login.yaml`

### Step 2: Copy the Relevant Sections
```bash
# Don't run the templates directly!
# Copy the sections you need to your own test file
```

### Step 3: Adapt to Your API
1. Replace the fake API URLs with your actual endpoints
2. Update the request structure to match your API
3. Modify assertions to match your expected responses
4. Add your authentication tokens/credentials

### Step 4: Create Your Test File
```bash
# Create your test in the parent directory
# Example: no-code-tests/api/user-service-tests.yaml
```

---

## ⚠️ Important Notes

### These Templates Use Fake APIs
All templates use public demo APIs like:
- `https://reqres.in` - Fake REST API for testing
- Example/placeholder endpoints

**DO NOT run these as actual tests** - they won't test your real services!

### Templates vs Real Tests

**Templates (in this folder):**
```
no-code-tests/api/_templates/
├── advanced-examples.yaml       # For learning/reference only
├── authenticated-api.yaml       # Pattern examples
└── data-driven-login.yaml       # Data-driven pattern
```

**Real Tests (in parent folder):**
```
no-code-tests/api/
├── nexus-tests.yaml            # Real Nexus tests
├── user-service-tests.yaml     # Real user service tests (future)
└── order-service-tests.yaml    # Real order service tests (future)
```

---

## 📖 Further Reading

- [No-Code Framework Guide](../../../docs/NO_CODE_FRAMEWORK_GUIDE.md)
- [Quick Start Guide](../../../docs/QUICKSTART.md)
- [Service Configuration](../../../config/services.yaml)

---

## 🆘 Need Help?

1. **Check the templates** - Most patterns are already demonstrated
2. **Review existing tests** - See how nexus-tests.yaml is structured
3. **Read the documentation** - Comprehensive guides in docs/ folder
4. **Service configuration** - config/services.yaml for service setup

---

**Remember:** These are templates for reference, not tests to run!  
Create your own test files based on these patterns. ✨