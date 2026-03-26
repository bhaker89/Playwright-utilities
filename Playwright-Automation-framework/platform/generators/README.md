# API Test Generator

Auto-generates Playwright API tests from cURL commands using LLM.

## Quick Start

```bash
# 1. Set up environment
echo "OPENAI_API_KEY=your-key-here" >> .env

# 2. Generate test from cURL
node platform/cli/index.js generate-from-curl \
  --curl "curl -X POST 'https://api.example.com/v1/payments' -H 'Authorization: Bearer token' -d '{\"amount\": 100}'" \
  --service payment-service \
  --api process-payment

# 3. Run generated test
npx playwright test tests/api/payment-service/process-payment.spec.js
```

## Complete Flow

```
cURL Input
    ↓
1. Parse cURL (curl-parser.js)
    ↓
2. Generate Helper Method (api-helper-generator.js)
    → services/payment-service/payment-helper.js
    ↓
3. Execute API (api-executor.js)
    → Capture actual response
    ↓
4. Generate OpenAPI Spec (openapi-generator.js)
    → services/payment-service/apis/process-payment/openapi.yaml (SOURCE OF TRUTH)
    ↓
5. Generate Test Code (test-code-generator.js + LLM)
    → tests/api/payment-service/process-payment.spec.js
```

## Generated Artifacts

1. **Helper Method**: `services/{service}/apis/{service}-helper.js`
2. **OpenAPI Spec**: `services/{service}/apis/{api}/openapi.yaml` ⭐ SOURCE OF TRUTH
3. **Test File**: `tests/api/{service}/{api}.spec.js`

## Options

```bash
--curl, -c          cURL command (required)
--service, -s       Service name (required)
--api, -a           API name (required)
--skip-execute      Skip API execution (use mock)
--llm-provider      LLM provider: openai|claude|ollama (default: openai)
```

## Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview  # optional

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229  # optional

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434  # optional
OLLAMA_MODEL=codellama  # optional

# API Base URL (for relative URLs in cURL)
API_BASE_URL=http://localhost:3000  # optional
```

## File Structure

```
platform/generators/
├── api-helper-generator.js    # Step 1.5: Generate helper methods
├── openapi-generator.js       # Step 3: Generate OpenAPI specs
├── test-code-generator.js     # Step 4: Main test generator
├── llm-client.js              # LLM API client
├── context-gatherer.js        # Gather framework patterns
└── prompt-builder.js          # Build LLM prompts
```

## Examples

### Basic Usage
```bash
node platform/cli/index.js generate-from-curl \
  -c "curl -X GET 'https://api.example.com/users/123'" \
  -s user-service \
  -a get-user
```

### With Authentication
```bash
node platform/cli/index.js generate-from-curl \
  -c "curl -X POST 'https://api.example.com/orders' \
      -H 'Authorization: Bearer token123' \
      -H 'Content-Type: application/json' \
      -d '{\"items\": [{\"id\": \"item1\", \"qty\": 2}]}'" \
  -s order-service \
  -a create-order
```

### Skip Execution (Design Time)
```bash
node platform/cli/index.js generate-from-curl \
  -c "curl -X DELETE 'https://api.example.com/users/123'" \
  -s user-service \
  -a delete-user \
  --skip-execute
```

### Use Claude Instead of OpenAI
```bash
node platform/cli/index.js generate-from-curl \
  -c "curl ..." \
  -s payment-service \
  -a refund-payment \
  --llm-provider claude
```

## Troubleshooting

### Error: "OPENAI_API_KEY not found"
```bash
# Set in .env file
echo "OPENAI_API_KEY=sk-your-key" >> .env

# Or export directly
export OPENAI_API_KEY=sk-your-key
```

### Error: "Could not parse URL"
- Make sure cURL has complete URL or set API_BASE_URL
- Use quotes around cURL command

### Error: "Helper method not found"
- Check services/{service}/ directory exists
- Verify helper file was generated correctly

## Cost Estimates

- **Per API**: ~$0.10-0.15 (OpenAI GPT-4 Turbo)
- **Per API**: ~$0.05-0.08 (Claude)
- **Per API**: $0.00 (Ollama - local)

## Next Steps

After generation:
1. Review generated test code
2. Add additional test cases as needed
3. Update assertions for business logic
4. Run tests: `npx playwright test`

## Support

For issues or questions, check:
- docs/LLM_GENERATOR_QUICK_REFERENCE.md
- Generated OpenAPI spec (source of truth)