const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { chromium } = require('@playwright/test');

const { ServiceConfigLoader } = require('./service-config-loader');
const registryLoader = require('./locator-registry-loader');
const { UIEngine } = require('../engines/ui-engine');
const { AssertionEngine } = require('../engines/assertion-engine');
const { resolveRegistryEntryToSelectorStrings } = require('./locator-registry-resolver');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

async function resolveBaseUrl({ serviceName, explicitBaseUrl = null }) {
  if (explicitBaseUrl) return explicitBaseUrl;

  const loader = new ServiceConfigLoader();
  await loader.loadConfig();

  if (serviceName) {
    const service = loader.getService(serviceName);
    const baseUrl = service?.base_url || null;
    if (baseUrl) return baseUrl;
  }

  return process.env.BASE_URL || null;
}

function buildFullUrl(baseUrl, url) {
  if (!url) return baseUrl;
  if (/^https?:\/\//i.test(url)) return url;
  if (!baseUrl) return url;
  return String(baseUrl).replace(/\/+$/g, '') + '/' + String(url).replace(/^\/+/, '');
}

function inferFeatureFromIntent(spec) {
  const primaryAction = spec?.intent?.primary_action || null;
  if (!primaryAction) {
    throw new Error('Missing required field: intent.primary_action');
  }

  const feature = spec?.intent?.feature
    ? slugify(spec.intent.feature)
    : slugify(primaryAction);

  if (!feature) {
    throw new Error('Unable to infer feature name. Provide intent.feature or intent.primary_action');
  }

  return feature;
}

function resolveTargetSelectorOrThrow({ registry, targetKey }) {
  if (!registry || typeof registry !== 'object') {
    throw new Error('Locator registry not loaded. Did you run ground-spec?');
  }

  const entry = registry[targetKey];
  if (!entry) {
    throw new Error(`Target '${targetKey}' not found in locator registry.`);
  }

  const resolved = resolveRegistryEntryToSelectorStrings(entry);
  if (!resolved?.primarySelector) {
    throw new Error(`Target '${targetKey}' has invalid registry entry (missing primary selector).`);
  }

  return resolved.primarySelector;
}

function toUiEngineSteps({ intentSpec, registry, baseUrl }) {
  const steps = Array.isArray(intentSpec?.steps) ? intentSpec.steps : [];

  return steps.map((step) => {
    if (!step || typeof step !== 'object') return step;

    if (step.action === 'goto' || step.action === 'navigate') {
      return {
        ...step,
        url: buildFullUrl(baseUrl, step.url),
      };
    }

    // All other UI actions must resolve via target -> selector
    const targetKey = step.target;
    if (!targetKey) {
      throw new Error(`UI step is missing required field 'target' for action '${step.action}'.`);
    }

    const selector = resolveTargetSelectorOrThrow({ registry, targetKey });

    return {
      ...step,
      selector,

      // Provide stable name for LIE telemetry/memory keys.
      element: targetKey,
    };
  });
}

function toAssertionEngineAssertions({ intentSpec, registry }) {
  const assertions = Array.isArray(intentSpec?.assertions) ? intentSpec.assertions : [];

  return assertions.map((assertion) => {
    if (!assertion || typeof assertion !== 'object') return assertion;

    const targetKey = assertion.target;
    if (!targetKey) {
      throw new Error(`Assertion is missing required field 'target' (type '${assertion.type}').`);
    }

    const selector = resolveTargetSelectorOrThrow({ registry, targetKey });

    // Canonical intent schema uses simplified types. Map to existing AssertionEngine types.
    if (assertion.type === 'visible') {
      return {
        type: 'ui_visible',
        selector,
        expected: assertion.expected,
      };
    }

    if (assertion.type === 'text') {
      return {
        type: 'ui_text',
        selector,
        expected: assertion.expected,
      };
    }

    // Allow direct pass-through for existing AssertionEngine types.
    if (String(assertion.type || '').startsWith('ui_')) {
      return {
        ...assertion,
        selector,
      };
    }

    throw new Error(`Unsupported assertion type in intent spec: ${assertion.type}`);
  });
}

/**
 * Execute a canonical intent spec using locator registry + UIEngine self-healing.
 *
 * Expected pipeline:
 * prompt -> intent spec YAML -> ground-spec -> locator registry YAML -> run-intent
 */
async function runIntentSpec(options) {
  const {
    specPath,
    service: cliService = null,
    baseUrl: explicitBaseUrl = null,
    storageStatePath = '.auth/user.json',
    headless = true,
  } = options || {};

  if (!specPath) {
    throw new Error('Missing required argument: specPath');
  }

  const absoluteSpecPath = path.resolve(specPath);
  if (!fs.existsSync(absoluteSpecPath)) {
    throw new Error(`Spec file not found: ${absoluteSpecPath}`);
  }

  const intentSpec = yaml.load(fs.readFileSync(absoluteSpecPath, 'utf8'));

  const serviceName = cliService || intentSpec?.metadata?.service || null;
  if (!serviceName) {
    throw new Error('Missing required service. Provide --service or set metadata.service in the spec.');
  }

  const feature = inferFeatureFromIntent(intentSpec);

  const baseUrl = await resolveBaseUrl({ serviceName, explicitBaseUrl });
  if (!baseUrl) {
    throw new Error(
      `Unable to resolve base URL for service '${serviceName}'. ` +
      `Set services.yaml base_url for the service, or provide --base-url, or set BASE_URL env var.`
    );
  }

  const registry = registryLoader.loadServiceRegistry(serviceName, feature);
  if (!registry) {
    throw new Error(
      `Locator registry not found for service='${serviceName}', feature='${feature}'. ` +
      `Run the grounding step first (ground-spec).`
    );
  }

  const browser = await chromium.launch({ headless });

  try {
    const contextOptions = {};
    const resolvedStorageStatePath = storageStatePath ? path.resolve(storageStatePath) : null;
    if (resolvedStorageStatePath && fs.existsSync(resolvedStorageStatePath)) {
      contextOptions.storageState = resolvedStorageStatePath;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    const uiEngine = new UIEngine(page, intentSpec?.testSuite?.name || feature);

    const uiSteps = toUiEngineSteps({ intentSpec, registry, baseUrl });
    await uiEngine.executeSteps(uiSteps);

    const assertionEngine = new AssertionEngine();
    const assertions = toAssertionEngineAssertions({ intentSpec, registry });

    if (assertions.length > 0) {
      const results = await assertionEngine.executeAssertions(null, assertions, Date.now(), page);
      for (const r of results) {
        if (!r.passed) {
          throw new Error(r.message || `Assertion failed: ${r.type}`);
        }
      }
    }

    return {
      service: serviceName,
      feature,
      specPath: absoluteSpecPath,
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  runIntentSpec,
};