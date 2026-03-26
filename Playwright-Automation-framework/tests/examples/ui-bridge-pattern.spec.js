const { test, expect } = require('../../fixtures/base-test');

/**
 * Example UI Test using the new Bridge pattern
 * Demonstrates:
 * - Bridge (single entry point)
 * - PlaywrightWrapper (high-level actions)
 * - SmartLocator (self-healing)
 * - storageState (shared auth)
 * - AssertWrapper (consistent assertions)
 */

test.describe('UI Test Examples - New Pattern (No BDD)', () => {
  
  test('Example 1: Simple navigation and assertion', async ({ bridge }) => {
    // Navigate using wrapper
    await bridge.goto('https://www.1mg.com');
    
    // Assert using assert wrapper
    await bridge.assert.toHaveURL(/1mg\.com/);
    await bridge.assert.toBeVisible('.logo', 'Site Logo');
  });

  test('Example 2: Login flow with self-healing', async ({ bridge }) => {
    // All locators have self-healing built-in via SmartLocator
    await bridge.loginPage.navigate();
    await bridge.loginPage.loginWithOTP('9876543210', '123456');
    
    // If locators break, SmartLocator will:
    // 1. Check component registry (cached fixes)
    // 2. Try fuzzy matching
    // 3. Ask LLM for help
    
    await bridge.assert.toHaveURL(/\/(dashboard|home)/);
  });

  test('Example 3: Using PlaywrightWrapper directly', async ({ bridge }) => {
    await bridge.goto('https://www.1mg.com');
    
    // All wrapper methods have self-healing + logging
    await bridge.wrapper.clickByText('Medicines', { exact: true });
    await bridge.wrapper.waitForURL(/\/drugs/);
    await bridge.wrapper.fillByPlaceholder('Search for medicines', 'Paracetamol');
    await bridge.wrapper.pressKey('Enter');
    
    await bridge.assert.toContainText('h1', 'Paracetamol', 'Search Results');
  });

  test('Example 4: Dropdown interactions', async ({ bridge }) => {
    await bridge.goto('https://www.1mg.com/cart');
    
    // Custom dropdown helper (common pattern)
    await bridge.wrapper.selectDropdownOption(
      '.address-selector', 
      'Home Address',
      'Delivery Address'
    );
    
    // For searchable dropdowns
    await bridge.wrapper.searchAndSelect(
      '.pincode-selector',
      '110001',
      '110001 - New Delhi',
      'Pincode'
    );
  });

  test('Example 5: UI + API integrated test (shared storageState)', async ({ bridge }) => {
    // API client is already authenticated via storageState
    const response = await bridge.apiClient.get('/api/user/profile');
    expect(response.status).toBe(200);
    
    // Store data in shared context
    bridge.context.set('userId', response.body.id);
    bridge.context.set('userName', response.body.name);
    
    // Verify in UI
    const userId = bridge.context.get('userId');
    await bridge.goto(`https://www.1mg.com/profile/${userId}`);
    await bridge.assert.toContainText('.user-name', bridge.context.get('userName'), 'User Name');
  });

  test('Example 6: Self-healing in action (simulate broken locator)', async ({ bridge }) => {
    await bridge.goto('https://www.1mg.com');
    
    // Even if this selector breaks, SmartLocator will:
    // - Try fuzzy text match
    // - Use LLM to find the element
    // - Cache the fix for future runs
    await bridge.wrapper.click('.some-button-that-might-break', 'Submit Button');
    
    // Healing events are logged to reports/healing-analytics.json
  });

  test('Example 7: Multiple assertions', async ({ bridge }) => {
    await bridge.goto('https://www.1mg.com');
    
    // All assertions log success/failure
    await bridge.assert.toBeVisible('.header', 'Header');
    await bridge.assert.toBeEnabled('.search-input', 'Search Input');
    await bridge.assert.toHaveAttribute('.search-input', 'placeholder', /search/i, 'Search Placeholder');
    await bridge.assert.toHaveCount('.nav-item', 5, 'Navigation Items');
  });

  test('Example 8: Conditional actions (dismiss modal)', async ({ bridge }) => {
    await bridge.goto('https://www.1mg.com');
    
    // Dismiss cookie banner if present (won't fail if not found)
    await bridge.wrapper.dismissIfPresent('.cookie-banner', 'Cookie Banner');
    
    // Continue test
    await bridge.wrapper.clickByText('Shop by Category');
  });

});