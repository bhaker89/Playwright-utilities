# API Test Generator - Setup & Usage Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

This will install the new LLM packages:
- `openai` - For OpenAI GPT-4
- `@anthropic-ai/sdk` - For Claude
- `ollama` - For local LLMs

### Step 2: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your API key
nano .env
```

Add your OpenAI API key:
```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 3: Test It!

```bash
# Generate a test from cURL
npm run generate:from-curl -- \
  --curl "curl -X GET 'https://jsonplaceholder.typicode.com/users/1'" \
  --service user-service \
  --api get-user
```

---

## 📋 Complete Usage Guide

### Basic Command Structure

```bash
node platform/cli/index.js generate-from-curl \
  --curl "YOUR_CURL_COMMAND" \
  --service SERVICE_NAME \
  --api API_NAME \
  [OPTIONS]
```

### Options

| Option | Alias | Required | Description | Default |
|--------|-------|----------|-------------|---------|
| `--curl` | `-c` | ✅ Yes | Full cURL command | - |
| `--service` | `-s` | ✅ Yes | Service name (e.g., payment-service) | - |
| `--api` | `-a` | ✅ Yes | API name (e.g., process-payment) | - |
| `--skip-execute` | - | ❌ No | Skip API execution (use mock) | false |
| `--llm-provider` | - | ❌ No | LLM provider: openai/claude/ollama | openai |

---

## 📝 Real-World Examples

### Example 1: Simple GET Request

```bash
npm run generate:from-curl -- \
  --curl "curl -X GET 'https://api.example.com/v1/users/123'" \
  --service user-service \
  --api get-user-by-id
```

**Generates:**
1. `services/user-service/user-helper.js` → `getUserById()` method
2. `services/user-service/apis/get-user-by-id/openapi.yaml` ⭐ SOURCE OF TRUTH
3. `tests/api/user-service/get-user-by-id.spec.js` → Test file

---

### Example 2: POST with JSON Body

```bash
npm run generate:from-curl -- \
  --curl "curl -X POST 'https://api.example.com/v1/orders' \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer token123' \
    -d '{
      \"customerId\": \"cust_123\",
      \"items\": [
        {\"productId\": \"prod_456\", \"quantity\": 2}
      ],
      \"totalAmount\": 199.99
    }'" \
  --service order-service \
  --api create-order
```

**Generates:**
1. `services/order-service/order-helper.js` → `createOrder()` method
2. `services/order-service/apis/create-order/openapi.yaml`
3. `tests/api/order-service/create-order.spec.js`

---

### Example 3: Skip Execution (Design Time)

When API isn't ready yet or you just want the structure:

```bash
npm run generate:from-curl -- \
  --curl "curl -X DELETE 'https://api.example.com/v1/users/123'" \
  --service user-service \
  --api delete-user \
  --skip-execute
```

Uses mock response instead of calling the actual API.

---

### Example 4: Using Claude Instead of OpenAI

```bash
npm run generate:from-curl -- \
  --curl "curl -X PATCH 'https://api.example.com/v1/users/123' \
    -d '{\"name\": \"Updated Name\"}'" \
  --service user-service \
  --api update-user \
  --llm-provider claude
```

Requires `ANTHROPIC_API_KEY` in `.env`.

---

## 🔄 Complete Flow Explained

```
┌─────────────────┐
│   User Input    │
│  cURL Command   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Parse cURL                                      │
│ File: platform/parsers/curl-parser.js                   │
│ Output: { method, url, headers, body }                  │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 1.5: Generate Helper Method                        │
│ File: platform/generators/api-helper-generator.js       │
│ Output: services/{service}/{service}-helper.js          │
│ Example: PaymentHelper.processPayment() method added    │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Execute API                                     │
│ File: platform/engines/api-executor.js                  │
│ Action: Calls helper method, captures response          │
│ Output: { status: 201, body: {...}, time: 245ms }       │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Generate OpenAPI Spec                           │
│ File: platform/generators/openapi-generator.js          │
│ Output: services/{service}/apis/{api}/openapi.yaml      │
│ 📌 THIS IS THE SOURCE OF TRUTH                          │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 4: Generate Test Code via LLM                      │
│ Files: test-code-generator.js + llm-client.js           │
│ Action: Reads OpenAPI + framework context → LLM         │
│ Output: tests/api/{service}/{api}.spec.js               │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Generated Artifacts

After running the command, you'll have 3 new files:

### 1. Helper Method
**Location:** `services/{service-name}/{service-name}-helper.js`

Example:
```javascript
class PaymentHelper {
  static async processPayment(apiContext, payload) {
    logger.info(`💳 Processing Payment...`);
    const response = await apiContext.post('/v1/payments', {
      data: payload
    });
    return response;
  }
}
```

### 2. OpenAPI Spec ⭐ SOURCE OF TRUTH
**Location:** `services/{service-name}/apis/{api-name}/openapi.yaml`

Example:
```yaml
openapi: 3.0.0
info:
  title: Process Payment API
  version: 1.0.0
paths:
  /v1/payments:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                amount:
                  type: number
      responses:
        '201':
          description: Payment created successfully
```

### 3. Test File
**Location:** `tests/api/{service-name}/{api-name}.spec.js`

Example:
```javascript
const { test, expect } = require('../../../fixtures/base-test');
const { PaymentHelper } = require('../../../services/payment-service/payment-helper');

test.describe('Process Payment API', () => {
  test('should process payment successfully', async ({ apiClient }) => {
    const payload = { amount: 100, currency: 'USD' };
    
    const response = await PaymentHelper.processPayment(apiClient, payload);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

---

## 🎯 Running Generated Tests

```bash
# Run specific test
npx playwright test tests/api/payment-service/process-payment.spec.js

# Run all tests for a service
npx playwright test tests/api/payment-service/

# Run with UI mode
npx playwright test tests/api/payment-service/ --ui

# Debug mode
npx playwright test tests/api/payment-service/ --debug
```

---

## 🔧 Troubleshooting

### Error: "OPENAI_API_KEY not found"

**Solution:**
```bash
# Check if .env exists
ls -la .env

# Add your key
echo "OPENAI_API_KEY=sk-your-key" >> .env

# Or export directly
export OPENAI_API_KEY=sk-your-key
```

---

### Error: "Could not parse URL"

**Problem:** cURL has relative URL like `/api/users`

**Solution:**
```bash
# Option 1: Add API_BASE_URL to .env
echo "API_BASE_URL=https://api.example.com" >> .env

# Option 2: Use absolute URL in cURL
--curl "curl https://api.example.com/api/users"
```

---

### Error: "Helper method not found"

**Problem:** Service directory doesn't exist

**Solution:**
```bash
# Create service directory first
mkdir -p services/your-service-name

# Then run the command again
```

---

### Error: "LLM generation failed"

**Solutions:**
1. Check API key is valid
2. Check internet connection
3. Try different provider: `--llm-provider claude`
4. Check rate limits on your LLM provider

---

## 💰 Cost Estimates

### OpenAI (GPT-4 Turbo)
- **Per API**: ~$0.10-0.15
- **100 APIs**: ~$10-15
- **1000 APIs**: ~$100-150

### Anthropic (Claude)
- **Per API**: ~$0.05-0.08
- **100 APIs**: ~$5-8
- **1000 APIs**: ~$50-80

### Ollama (Local)
- **Per API**: $0.00 (FREE!)
- **Requirements**: Local installation

---

## 🚦 Best Practices

### 1. Use Descriptive Names

✅ Good:
```bash
--service payment-service --api process-payment
```

❌ Bad:
```bash
--service ps --api pp
```

---

### 2. Review Generated Code

Always review:
1. Helper method (correct endpoint?)
2. OpenAPI spec (accurate schema?)
3. Test file (correct assertions?)

---

### 3. Keep OpenAPI as Source of Truth

- Store in version control
- Update when API changes
- Regenerate tests from updated spec

---

### 4. Use Skip-Execute During Design

If API isn't ready:
```bash
--skip-execute
```

---

## 📚 Additional Resources

- [LLM Generator Reference](docs/LLM_GENERATOR_QUICK_REFERENCE.md)
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Helper Methods Guide](docs/HELPER_METHODS_GUIDE.md)

---

## 🆘 Support

For help:
1. Check this guide
2. Review example tests in `tests/api/`
3. Check generated OpenAPI spec
4. Review logs in console output

---

## 🎉 Quick Success Test

Test the setup with a public API:

```bash
npm run generate:from-curl -- \
  --curl "curl https://jsonplaceholder.typicode.com/posts/1" \
  --service blog-service \
  --api get-post

# Run the generated test
npx playwright test tests/api/blog-service/get-post.spec.js
```

If this works, you're all set! 🚀