const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

/**
 * Write a Playwright `*.spec.js` wrapper that executes a canonical intent spec.
 *
 * Why a wrapper?
 * - Lets teams run `npx playwright test ...` and get reporting/CI integration.
 * - Keeps the real flow definition in YAML (prompt -> spec -> grounding -> run).
 *
 * Note: The wrapper delegates execution to `runIntentSpec()` which currently launches
 * its own Chromium instance. This keeps the implementation simple and decoupled from
 * Playwright Test fixtures.
 */
function writeIntentPlaywrightSpec(options) {
  const {
    specPath,
    service,
    outDir = path.join(process.cwd(), 'tests', 'ui', 'intent'),
    fileName = null,
  } = options || {};

  if (!specPath) throw new Error('writeIntentPlaywrightSpec: missing specPath');
  if (!service) throw new Error('writeIntentPlaywrightSpec: missing service');

  const absoluteSpecPath = path.resolve(specPath);
  if (!fs.existsSync(absoluteSpecPath)) {
    throw new Error(`Intent spec not found: ${absoluteSpecPath}`);
  }

  const spec = yaml.load(fs.readFileSync(absoluteSpecPath, 'utf8'));
  const suiteName = spec?.testSuite?.name || path.basename(absoluteSpecPath, path.extname(absoluteSpecPath));
  const slug = slugify(suiteName);

  const resolvedFileName = fileName || `${slug}.intent.spec.js`;
  const absoluteOutDir = path.resolve(outDir);
  const outPath = path.join(absoluteOutDir, resolvedFileName);

  const code = `// Auto-generated wrapper for intent spec execution.
// Spec: ${absoluteSpecPath}

const { test, expect } = require('@playwright/test');
const path = require('path');
const { runIntentSpec } = require('../../../platform/core/intent-runner');

test.describe('${suiteName}', () => {
  test('${suiteName}: run intent spec', async () => {
    // Keep this generous; grounding + healing flows can be slower on staging.
    test.setTimeout(3 * 60 * 1000);

    const result = await runIntentSpec({
      specPath: path.resolve(__dirname, '../../../${path.relative(process.cwd(), absoluteSpecPath).replace(/\\/g, '/')}'),
      service: '${service}',
      baseUrl: process.env.UI_BASE_URL || process.env.BASE_URL || null,
      storageStatePath: process.env.INTENT_STORAGE_STATE || null,
      headless: process.env.HEADED ? false : true,
      smoke: false,
      strict: false,
    });

    expect(result).toBeTruthy();
    expect(result.service).toBe('${service}');
  });
});
`;

  if (!fs.existsSync(absoluteOutDir)) {
    fs.mkdirSync(absoluteOutDir, { recursive: true });
  }

  fs.writeFileSync(outPath, code, 'utf8');

  return {
    outPath,
    suiteName,
  };
}

module.exports = {
  writeIntentPlaywrightSpec,
};