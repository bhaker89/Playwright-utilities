# Generators Directory

## 📋 Overview

This directory contains code generation engines that transform natural language, API specifications, and other inputs into executable test code.

## 🗂️ File Structure

```
platform/generators/
├── ui-test-code-generator.js     # UI test code generation engine
├── api-helper-generator.js       # API helper method generator
├── openapi-generator.js          # OpenAPI specification generator
├── test-code-generator.js        # Generic test code generator
├── llm-client.js                 # LLM communication client
├── context-gatherer.js           # Framework pattern context gatherer
├── prompt-builder.js             # LLM prompt builder
└── README.md                     # This file
```

## 📚 Generator Descriptions

### `ui-test-code-generator.js`
**Purpose:** Core engine for UI test generation from natural language

**Capabilities:**
- Analyzes natural language descriptions using LLM
- Generates test plans and structures
- Creates Playwright test files (with/without Page Objects)
- Generates YAML no-code test definitions
- Creates Page Object Model classes
- Integrates self-healing capabilities
- Supports comprehensive test coverage (positive, negative, edge cases)

**Usage:**
```javascript
const { UITestGenerator } = require('./ui-test-code-generator');
const generator = new UITestGenerator();

const result = await generator.generateFromPrompt(
    'Test login with comprehensive coverage',
    {
        format: 'playwright',
        withPageObjects: true,
        withSelfHealing: true,
        coverage: {
            includeNegative: true,
            includeEdge: true,
            includeErrorValidation: true,
            level: 'comprehensive'
        }
    }
);
```

**Exports:** `UITestGenerator` class

**Related CLI:** `platform/cli/ui-test-generator-cli.js`

---

### `api-helper-generator.js`
**Purpose:** Generates reusable API helper methods from API specifications

**Capabilities:**
- Creates service-specific helper classes
- Generates typed method signatures
- Includes request/response handling
- Adds logging and error handling
- Supports authentication patterns

**Generated File:** `services/{service}-helper.js`

**Usage:**
```javascript
const { APIHelperGenerator } = require('./api-helper-generator');
const generator = new APIHelperGenerator();

await generator.generateHelper({
    serviceName: 'user-service',
    apiName: 'get-user',
    method: 'GET',
    endpoint: '/users/:id'
});
```

---

### `openapi-generator.js`
**Purpose:** Generates OpenAPI specification YAML files from API responses

**Capabilities:**
- Creates OpenAPI 3.0 specifications
- Infers schemas from actual responses
- Documents request/response formats
- Serves as source of truth for API contracts

**Generated File:** `services/{service}/apis/{api}/openapi.yaml`

**Usage:**
```javascript
const { OpenAPIGenerator } = require('./openapi-generator');
const generator = new OpenAPIGenerator();

await generator.generateSpec({
    serviceName: 'payment-service',
    apiName: 'process-payment',
    request: { method: 'POST', body: {...}, headers: {...} },
    response: { status: 200, body: {...}, headers: {...} }
});
```

---

### `test-code-generator.js`
**Purpose:** Generates Playwright API test code using LLM

**Capabilities:**
- Uses LLM to generate intelligent test code
- Includes assertions based on OpenAPI spec
- Adds error handling test cases
- Follows framework patterns and conventions
- Supports multiple assertion strategies

**Generated File:** `tests/api/{service}/{api}.spec.js`

**Usage:**
```javascript
const { TestCodeGenerator } = require('./test-code-generator');
const generator = new TestCodeGenerator();

await generator.generateTest({
    serviceName: 'order-service',
    apiName: 'create-order',
    openAPISpec: {...},
    helperMethod: 'createOrder'
});
```

---

### `llm-client.js`
**Purpose:** Unified client for multiple LLM providers

**Capabilities:**
- Supports OpenAI (GPT-4, GPT-3.5)
- Supports Anthropic (Claude)
- Supports Ollama (local models)
- Provides retry logic and error handling
- Token counting and cost estimation
- Streaming support

**Usage:**
```javascript
const { LLMClient } = require('./llm-client');
const client = new LLMClient({
    provider: 'openai',  // 'openai', 'anthropic', 'ollama'
    model: 'gpt-4-turbo-preview'
});

const response = await client.complete({
    system: 'You are a test generation expert',
    prompt: 'Generate a test for login functionality',
    temperature: 0.7
});
```

**Environment Variables:**
```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=codellama
```

---

### `context-gatherer.js`
**Purpose:** Gathers framework patterns and conventions for LLM context

**Capabilities:**
- Scans existing test files for patterns
- Extracts assertion styles
- Identifies helper usage patterns
- Collects Page Object examples
- Builds context for consistent code generation

**Usage:**
```javascript
const { ContextGatherer } = require('./context-gatherer');
const gatherer = new ContextGatherer();

const context = await gatherer.gatherFrameworkContext();
// Returns: { patterns, examples, conventions }
```

---

### `prompt-builder.js`
**Purpose:** Constructs optimized prompts for LLM requests

**Capabilities:**
- Builds structured prompts with examples
- Includes framework context
- Adds constraints and requirements
- Optimizes token usage
- Supports few-shot learning

**Usage:**
```javascript
const { PromptBuilder } = require('./prompt-builder');
const builder = new PromptBuilder();

const prompt = builder.buildTestGenerationPrompt({
    description: 'Test login flow',
    framework: 'Playwright',
    patterns: context.patterns,
    examples: context.examples
});
```

---

## 🔄 Generation Flows

### UI Test Generation Flow

```
User Description
    ↓
[LLM Client] Analyze prompt
    ↓
[UI Test Code Generator] Create test plan
    ↓
[UI Test Code Generator] Generate test structure
    ↓
├─→ [Page Object Generation] (if enabled)
├─→ [YAML Generation] (if selected)
└─→ [Playwright Test Generation]
    ↓
Generated Files:
- pages/login.page.js
- pages/dashboard.page.js
- tests/generated-tests/login-flow.spec.js
- no-code-tests/login-flow.yaml
```

### API Test Generation Flow

```
cURL Command
    ↓
[Parse cURL] Extract request details
    ↓
[API Helper Generator] Create helper method
    ↓
[API Executor] Execute real API call
    ↓
[OpenAPI Generator] Generate spec from response
    ↓
[Context Gatherer] Collect framework patterns
    ↓
[Prompt Builder] Build LLM prompt
    ↓
[LLM Client] Generate test code
    ↓
[Test Code Generator] Format and save
    ↓
Generated Files:
- services/user-service/user-helper.js
- services/user-service/apis/get-user/openapi.yaml
- tests/api/user-service/get-user.spec.js
```

## 🎯 Design Principles

### Separation of Concerns
- **CLI files** → User interaction only
- **Generator files** → Pure business logic
- **Core files** → Shared services

### Single Responsibility
Each generator has ONE clear job:
- `ui-test-code-generator.js` → Generate UI test code
- `api-helper-generator.js` → Generate API helpers
- `openapi-generator.js` → Generate OpenAPI specs

### Reusability
All generators can be:
- ✅ Used programmatically
- ✅ Called from CLI
- ✅ Integrated in CI/CD
- ✅ Unit tested independently

### Extensibility
Easy to add new generators:
```javascript
// platform/generators/load-test-generator.js
class LoadTestGenerator {
    async generateFromScenario(scenario, options) {
        // Implementation
    }
}
module.exports = { LoadTestGenerator };
```

## 🧪 Testing Generators

```javascript
// Example: Testing UI Test Generator
const { UITestGenerator } = require('./ui-test-code-generator');

describe('UITestGenerator', () => {
    it('should generate test from prompt', async () => {
        const generator = new UITestGenerator();
        const result = await generator.generateFromPrompt(
            'Test login with valid credentials'
        );
        
        expect(result.files.playwright).toBeDefined();
        expect(fs.existsSync(result.files.playwright)).toBe(true);
    });
});
```

## 📊 Cost Considerations

### LLM Token Usage

| Generator | Avg Tokens | Cost (GPT-4) | Cost (Claude) | Cost (Ollama) |
|-----------|------------|--------------|---------------|---------------|
| UI Test Generation | 2,000-4,000 | $0.08-0.16 | $0.04-0.08 | Free |
| API Test Generation | 1,500-3,000 | $0.06-0.12 | $0.03-0.06 | Free |
| Comprehensive Coverage | 4,000-8,000 | $0.16-0.32 | $0.08-0.16 | Free |

**Recommendation:** Use Ollama locally for development, GPT-4 for production.

## 🔐 Security Considerations

1. **API Keys:** Never commit API keys
2. **Generated Code:** Always review before running
3. **API Execution:** Be cautious with real API calls
4. **Sensitive Data:** Sanitize before sending to LLM

## 📖 Related Documentation

- [UI Test Generator Guide](../../docs/UI_TEST_GENERATOR_GUIDE.md)
- [API Test Generator Setup](../../docs/API_TEST_GENERATOR_SETUP.md)
- [LLM Generator Quick Reference](../../docs/LLM_GENERATOR_QUICK_REFERENCE.md)
- [File Naming Conventions](../../docs/FILE_NAMING_CONVENTIONS.md)
- [Refactoring History](../../docs/REFACTORING_FILE_NAMING.md)

## 🚀 Quick Commands

```bash
# Generate UI test (interactive)
npm run generate:ui-test

# Generate UI test (direct)
node platform/cli/ui-test-generator-cli.js

# Generate API test
node platform/cli/index.js generate-from-curl \
  -c "curl ..." \
  -s service-name \
  -a api-name

# Test generators
npm test -- generators/
```

## 🛠️ Development

### Adding a New Generator

1. Create file: `platform/generators/my-feature-generator.js`
2. Export class: `module.exports = { MyFeatureGenerator };`
3. Add CLI if needed: `platform/cli/my-feature-cli.js`
4. Update this README
5. Add documentation: `docs/MY_FEATURE_GUIDE.md`
6. Add tests

### Naming Convention

Follow the pattern: `<what-it-generates>-generator.js`

Examples:
- ✅ `ui-test-code-generator.js` (generates UI test code)
- ✅ `api-helper-generator.js` (generates API helpers)
- ✅ `load-test-generator.js` (generates load tests)
- ❌ `generator.js` (too generic)
- ❌ `test-gen.js` (use full word)

See [File Naming Conventions](../../docs/FILE_NAMING_CONVENTIONS.md) for details.

---

**Last Updated:** March 16, 2026  
**Maintainer:** Framework Team