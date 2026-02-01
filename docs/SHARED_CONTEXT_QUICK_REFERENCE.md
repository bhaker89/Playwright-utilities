# Shared Test Context - Quick Reference

## Import

```typescript
import { test, expect, sharedContext, ContextHelpers } from '../fixtures/base-test';
```

## Basic Operations

```typescript
// Set value
sharedContext.set('key', 'value');
sharedContext.set('key', 'value', 'suite');  // With scope

// Get value
const value = sharedContext.get<string>('key');
const value = sharedContext.get<string>('key', 'global', 'default');  // With default

// Check existence
if (sharedContext.has('key')) { /* ... */ }

// Delete
sharedContext.delete('key');
```

## Nested Keys (Dot Notation)

```typescript
// Set nested
sharedContext.set('auth.token', 'abc123');
sharedContext.set('auth.user.id', 999);

// Get nested
const token = sharedContext.get<string>('auth.token');
const userId = sharedContext.get<number>('auth.user.id');
```

## Arrays

```typescript
// Push
sharedContext.push('orderIds', '123');
sharedContext.push('orderIds', '456');

// Get array
const ids = sharedContext.get<string[]>('orderIds');  // ['123', '456']

// Pop
const last = sharedContext.pop<string>('orderIds');  // '456'
```

## Objects

```typescript
// Merge
sharedContext.set('config', { timeout: 5000 });
sharedContext.merge('config', { retries: 3 });
// Result: { timeout: 5000, retries: 3 }
```

## Scopes

```typescript
// Global (default) - persists across all tests
sharedContext.set('key', 'value', 'global');

// Suite - persists within test suite
sharedContext.set('key', 'value', 'suite');

// Test - only current test (auto-cleared)
sharedContext.set('key', 'value', 'test');
```

## Helper Functions

```typescript
// Auth
ContextHelpers.setAuth({ token: 'abc', userId: 123 });
const auth = ContextHelpers.getAuth();

// User
ContextHelpers.setUser({ id: 123, name: 'John' });
const user = ContextHelpers.getUser();

// API Response
ContextHelpers.setApiResponse('createUser', { status: 201, body: {...} });
const response = ContextHelpers.getApiResponse('createUser');

// Resource IDs
ContextHelpers.setResourceId('user', 123);
const userId = ContextHelpers.getResourceId('user');
```

## Utility Methods

```typescript
// Get all keys
const keys = sharedContext.getKeys('global');

// Get size
const count = sharedContext.size('global');

// Clear scope
sharedContext.clearScope('suite');
sharedContext.clearAll();

// Export/Import
const json = sharedContext.toJSON('all');
sharedContext.fromJSON(json, 'global');

// Debug print
sharedContext.print('all');
```

## Common Patterns

### API Login → UI Use Token

```typescript
test('API login', async ({ apiClient, sharedContext }) => {
  const response = await apiClient.post('/login', credentials);
  ContextHelpers.setAuth({ token: response.body.token });
});

test('UI use token', async ({ page, sharedContext }) => {
  const auth = ContextHelpers.getAuth();
  await page.evaluate((token) => {
    localStorage.setItem('token', token);
  }, auth.token);
});
```

### Create via API → Verify in UI

```typescript
test('Create and verify', async ({ page, apiClient, sharedContext }) => {
  // Create
  const response = await apiClient.post('/users', userData);
  ContextHelpers.setUser({ id: response.body.id, ...userData });
  
  // Verify
  const user = ContextHelpers.getUser();
  await page.goto(`/users/${user.id}`);
  await expect(page.locator('.user-name')).toHaveText(user.name);
});
```

### Multi-Step Workflow

```typescript
test('Complete workflow', async ({ sharedContext, apiClient }) => {
  // Step 1: Create user
  const userResp = await apiClient.post('/users', {...});
  ContextHelpers.setResourceId('user', userResp.body.id);
  
  // Step 2: Create order (using user ID)
  const orderResp = await apiClient.post('/orders', {
    userId: ContextHelpers.getResourceId('user'),
    product: 'Widget',
  });
  ContextHelpers.setResourceId('order', orderResp.body.id);
  
  // Step 3: Process order
  await apiClient.post(`/orders/${ContextHelpers.getResourceId('order')}/process`);
});
```

## Type Definitions

```typescript
interface AuthContext {
  token?: string;
  refreshToken?: string;
  userId?: string | number;
  username?: string;
  expiresAt?: number;
}

interface UserContext {
  id: string | number;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

interface ApiResponseContext {
  status: number;
  body: any;
  headers?: Record<string, string>;
  responseTime?: number;
}
```

## Best Practices

✅ Use appropriate scopes (global for shared, test for temporary)  
✅ Use generic types: `get<string>()`, `get<number>()`  
✅ Provide default values when optional  
✅ Use helper functions for common patterns  
✅ Clear suite scope in `afterAll` hooks  
✅ Use dot notation for nested data  
✅ Document shared keys in comments  

❌ Don't use global scope for test-specific data  
❌ Don't assume keys exist (check with `has()` or provide defaults)  
❌ Don't pollute context with unnecessary data  

## Run Examples

```bash
# Run shared context example tests
npm run test:shared-context

# Run all integrated tests (includes shared context)
npm run test:integrated
```

## Documentation

Full documentation: `docs/SHARED_CONTEXT.md`  
Examples: `tests/integrated/shared-context-example.spec.ts`