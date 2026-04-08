const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { chromium, request } = require('@playwright/test');

const { ServiceConfigLoader } = require('./service-config-loader');
const registryLoader = require('./locator-registry-loader');
const { UIEngine } = require('../engines/ui-engine');
const { AssertionEngine } = require('../engines/assertion-engine');
const { resolveRegistryEntryToSelectorStrings } = require('./locator-registry-resolver');

// Load .env.${TEST_ENV} so TEST_MOBILE/TEST_OTP etc. are present in process.env
require('../../config/environment.config');

const { AuthSeeder } = require('../../utils/api/auth-seeder');

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

function resolveUiAuthConfig({ serviceConfig }) {
  // Keep UI auth separate from API auth headers (`auth.type`) to avoid
  // changing ServiceConfigLoader.getAuthHeaders() behavior.
  const uiAuth = serviceConfig?.ui_auth || null;
  if (!uiAuth) return null;

  const mode = uiAuth.mode || null; // expected: 'otp' | 'google' (future)
  const storageStatePath = uiAuth.storage_state || null;

  if (!mode && !storageStatePath) return null;

  return {
    mode,
    storageStatePath,
  };
}

async function ensureStorageStateSeededIfNeeded({ uiAuthConfig, baseUrl }) {
  if (!uiAuthConfig) return;

  const { mode, storageStatePath } = uiAuthConfig;
  if (!storageStatePath) return;

  const resolvedPath = path.resolve(storageStatePath);
  if (fs.existsSync(resolvedPath)) return;

  if (mode === 'otp') {
    const mobile = process.env.TEST_MOBILE;
    const otp = process.env.TEST_OTP;

    if (!mobile || !otp) {
      throw new Error(
        `UI auth seeding requested (mode=otp) but TEST_MOBILE/TEST_OTP are missing. ` +
        `Set TEST_ENV appropriately (e.g. TEST_ENV=stag) so config/.env.<env> is loaded, ` +
        `or export TEST_MOBILE/TEST_OTP in the environment.`
      );
    }

    const apiContext = await request.newContext({ baseURL: baseUrl });
    try {
      const seeder = new AuthSeeder(apiContext, baseUrl, { authFile: resolvedPath });
      await seeder.seedSession(mobile, otp);
    } finally {
      await apiContext.dispose();
    }

    return;
  }

  if (mode === 'google') {
    throw new Error(
      `UI auth seeding requested (mode=google) but GoogleAuthSeeder is not implemented yet. ` +
      `For now, pre-seed storageState at '${storageStatePath}' and re-run.`
    );
  }

  throw new Error(`Unsupported ui_auth.mode '${mode}'. Supported: otp, google`);
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

    // URL assertions are not tied to a selector. We still require a target key so
    // grounding keeps a stable registry entry, but we intentionally ignore selector.
    if (assertion.type === 'url_contains') {
      return {
        type: 'ui_url_contains',
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
  // Critical entrypoint verification log for multi-squad debugging
  console.log('[PIPELINE] 🔒 ENTRYPOINT VERIFIED: intent-runner.js');
  console.log('[PIPELINE] All UI execution routes through locked entrypoint');
  
  const {
    specPath,
    service: cliService = null,
    baseUrl: explicitBaseUrl = null,

    // If provided, overrides service config.
    storageStatePath: cliStorageStatePath = undefined,

    headless = true,
    smoke = false,
    strict = false,
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

  // Load service config once so we can pick ui_auth settings.
  const serviceConfigLoader = new ServiceConfigLoader();
  await serviceConfigLoader.loadConfig();
  const serviceConfig = serviceConfigLoader.getService(serviceName);
  const uiAuthConfig = resolveUiAuthConfig({ serviceConfig });

  // Prefer storageState from service config unless explicitly overridden by caller.
  const effectiveStorageStatePath =
    cliStorageStatePath !== undefined
      ? cliStorageStatePath
      : (uiAuthConfig?.storageStatePath || '.auth/user.json');

  const baseUrl = await resolveBaseUrl({ serviceName, explicitBaseUrl });
  if (!baseUrl) {
    throw new Error(
      `Unable to resolve base URL for service '${serviceName}'. ` +
      `Set services.yaml base_url for the service, or provide --base-url, or set BASE_URL env var.`
    );
  }

  await ensureStorageStateSeededIfNeeded({ uiAuthConfig, baseUrl });

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
    const resolvedStorageStatePath = effectiveStorageStatePath ? path.resolve(effectiveStorageStatePath) : null;
    if (resolvedStorageStatePath && fs.existsSync(resolvedStorageStatePath)) {
      contextOptions.storageState = resolvedStorageStatePath;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    const uiEngine = new UIEngine(page, intentSpec?.testSuite?.name || feature);

    const uiSteps = toUiEngineSteps({ intentSpec, registry, baseUrl });

    // -----------------------------------------------------------------------
    // Optional smoke run mode
    // -----------------------------------------------------------------------
    // Purpose: Fast, deterministic validation of early steps before we rely on
    // healing. This is intended to catch bad grounding quickly (e.g., input
    // targets resolving to buttons) and produce actionable errors.
    const stepsToRun = smoke ? uiSteps.slice(0, 6) : uiSteps;

    for (const step of stepsToRun) {
      if (!strict || (step.action === 'goto' || step.action === 'navigate')) {
        await uiEngine.executeStep(step);
        continue;
      }

      // Strict checks for common mis-grounding scenarios.
      if ((step.action === 'fill' || step.action === 'type') && step.selector) {
        const loc = page.locator(step.selector).first();
        const tag = await loc.evaluate(el => el.tagName.toLowerCase()).catch(() => null);
        if (tag && !['input', 'textarea'].includes(tag)) {
          throw new Error(
            `Smoke/strict validation failed: action='${step.action}' expected an input/textarea but resolved to <${tag}> for target '${step.element || step.selector}'. ` +
            `This usually means grounding picked a wrong selector (e.g., primary-button).`
          );
        }
      }

      await uiEngine.executeStep(step);
    }

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