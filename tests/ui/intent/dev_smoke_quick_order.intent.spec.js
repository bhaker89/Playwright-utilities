// Auto-generated wrapper for intent spec execution.
// Spec: /Users/varun/IdeaProjects/Playwright-Automation/specs/intent/dev_smoke_quick_order.intent.yaml

const { test, expect } = require('@playwright/test');
const path = require('path');
const { runIntentSpec } = require('../../../platform/core/intent-runner');

test.describe('dev_smoke_quick_order', () => {
  test('dev_smoke_quick_order: run intent spec', async () => {
    // Keep this generous; grounding + healing flows can be slower on staging.
    test.setTimeout(3 * 60 * 1000);

    const result = await runIntentSpec({
      specPath: path.resolve(__dirname, '../../../specs/intent/dev_smoke_quick_order.intent.yaml'),
      service: '1mg-web',
      baseUrl: process.env.UI_BASE_URL || process.env.BASE_URL || null,
      storageStatePath: process.env.INTENT_STORAGE_STATE || null,
      headless: process.env.HEADED ? false : true,
      smoke: false,
      strict: false,
    });

    expect(result).toBeTruthy();
    expect(result.service).toBe('1mg-web');
  });
});
