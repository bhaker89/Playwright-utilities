const { test } = require('@playwright/test');

/**
 * LEGACY TEST SUITE (SKIPPED)
 *
 * This file previously validated the old 3-stage self-healing strategy:
 * Registry -> Fuzzy -> AI.
 *
 * The framework has migrated to SmartLocator -> LIE.
 */

test.describe.skip('LEGACY: 3-stage self-healing tests removed (migrated to LIE)', () => {
    test('deprecated', async () => {
        // Intentionally empty.
    });
});