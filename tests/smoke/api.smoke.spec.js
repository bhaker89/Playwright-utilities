const { test, expect } = require('@playwright/test');

test('smoke: API base URL responds', async ({ request }) => {
  // Sanity-first smoke check.
  // Try a small set of common health endpoints. Pass if any responds with < 500.
  const candidatePaths = ['/.health', '/health', '/ping', '/'];

  const failures = [];
  for (const candidatePath of candidatePaths) {
    try {
      const response = await request.get(candidatePath);
      const status = response.status();
      if (status < 500) {
        expect(status).toBeGreaterThan(0);
        return;
      }

      failures.push(`${candidatePath} -> ${status}`);
    } catch (error) {
      failures.push(`${candidatePath} -> ERROR: ${error.message}`);
    }
  }

  throw new Error(
    `API smoke failed. None of the sanity endpoints responded successfully. Attempts:\n- ${failures.join('\n- ')}`
  );
});