const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');
const { chromium } = require('@playwright/test');

const { ServiceConfigLoader } = require('./service-config-loader');
const { writeServiceRegistryEntry } = require('./locator-registry-writer');
const CandidateExtractor = require('../../framework/locator-intelligence/candidate-extractor');
const SelectorStabilityEvaluator = require('../../framework/locator-intelligence/selector-stability-evaluator');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function shortHash(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex').slice(0, 8);
}

function inferPrimaryFromSelector(selector) {
  const raw = String(selector || '').trim();
  if (!raw) return null;

  // Prefer to normalize xpath into the same representation used by CandidateExtractor.
  if (raw.startsWith('xpath=')) {
    return { type: 'xpath', value: raw.slice('xpath='.length) };
  }

  if (raw.startsWith('//') || raw.startsWith('(')) {
    return { type: 'xpath', value: raw };
  }

  // Playwright supports many selector engines (text=, role=, css=, etc.).
  // The most compatible storage for legacy is to keep the raw selector string.
  return { type: 'css', value: raw };
}

function buildTargetRequests(spec) {
  const requestsByKey = new Map();

  const steps = Array.isArray(spec?.steps) ? spec.steps : [];
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];

    const explicitTarget = step?.target && typeof step.target === 'string' ? step.target : null;
    const legacySelector = step?.selector && typeof step.selector === 'string' ? step.selector : null;

    // Canonical mode (preferred)
    if (explicitTarget) {
      // If both target and selector are present, keep the target (deterministic key) and
      // treat selector as a seed we can write directly (transitional mode).
      if (legacySelector) {
        if (!requestsByKey.has(explicitTarget)) {
          requestsByKey.set(explicitTarget, { targetKey: explicitTarget, selector: legacySelector });
        }
      } else {
        if (!requestsByKey.has(explicitTarget)) {
          requestsByKey.set(explicitTarget, { targetKey: explicitTarget, selector: null });
        }
      }
      continue;
    }

    // Transitional legacy mode: selector without a target.
    if (legacySelector) {
      const syntheticKey = `legacy_${slugify(step?.action || 'step')}_${index + 1}_${shortHash(legacySelector)}`;
      if (!requestsByKey.has(syntheticKey)) {
        requestsByKey.set(syntheticKey, { targetKey: syntheticKey, selector: legacySelector });
      }

      if (failedClicks.length > 0) {
        throw new Error(
          `Auto pre-steps failed: unable to click target(s): ${failedClicks.join(', ')}. ` +
          'Add an early click step in the intent spec that opens the correct modal/panel/menu, ' +
          'or provide --pre-steps as an escape hatch for this flow.'
        );
      }
    }
  }

  const assertions = Array.isArray(spec?.assertions) ? spec.assertions : [];
  for (let index = 0; index < assertions.length; index++) {
    const assertion = assertions[index];

    const explicitTarget = assertion?.target && typeof assertion.target === 'string' ? assertion.target : null;
    const legacySelector = assertion?.selector && typeof assertion.selector === 'string' ? assertion.selector : null;

    if (explicitTarget) {
      if (legacySelector) {
        if (!requestsByKey.has(explicitTarget)) {
          requestsByKey.set(explicitTarget, { targetKey: explicitTarget, selector: legacySelector });
        }
      } else {
        if (!requestsByKey.has(explicitTarget)) {
          requestsByKey.set(explicitTarget, { targetKey: explicitTarget, selector: null });
        }
      }
      continue;
    }

    // Transitional legacy mode: selector without a target.
    if (legacySelector) {
      const syntheticKey = `legacy_${slugify(assertion?.type || 'assertion')}_${index + 1}_${shortHash(legacySelector)}`;
      if (!requestsByKey.has(syntheticKey)) {
        requestsByKey.set(syntheticKey, { targetKey: syntheticKey, selector: legacySelector });
      }
    }
  }

  return Array.from(requestsByKey.values());
}

function getRoutesToVisit(spec) {
  const steps = Array.isArray(spec?.steps) ? spec.steps : [];
  return steps
    .filter(s => s?.action === 'goto' && typeof s?.url === 'string' && s.url.trim())
    .map(s => s.url);
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

  // Fallback to env (keeps CLI usable even if service config is missing)
  return process.env.BASE_URL || null;
}

function buildFullUrl(baseUrl, url) {
  if (!url) return baseUrl;
  if (/^https?:\/\//i.test(url)) return url;
  if (!baseUrl) return url;
  return String(baseUrl).replace(/\/+$/g, '') + '/' + String(url).replace(/^\/+/, '');
}

function strategyWeight(type) {
  switch (type) {
    case 'testid': return 1.0;
    case 'role': return 0.92;
    case 'label': return 0.88;
    case 'text': return 0.78;
    case 'css': return 0.62;
    case 'xpath': return 0.45;
    default: return 0.5;
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function computeGroundingScore(candidate) {
  const base = strategyWeight(candidate.type);
  const uniqueness = typeof candidate.uniqueness === 'number' ? candidate.uniqueness : 0;
  const stability = typeof candidate.stability === 'number' ? candidate.stability : 0.7;
  const entropy = typeof candidate.entropy === 'number' ? candidate.entropy : 0;
  const nameMatch = typeof candidate.nameMatch === 'number' ? candidate.nameMatch : 0;

  // Base selector-type preference + semantic match, then adjust for uniqueness and entropy.
  // - uniqueness: 1.0 means exactly one match
  // - entropy: 0.0 stable, 1.0 fragile
  const combined =
    (base * 0.55) +
    (nameMatch * 0.35) +
    (uniqueness * 0.15) +
    (stability * 0.15) -
    (entropy * 0.35);

  return clamp01(combined);
}

function computeConfidence(candidate) {
  // Confidence is a stable, explainable score derived from selector type + uniqueness + entropy.
  const base = strategyWeight(candidate.type);
  const uniqueness = typeof candidate.uniqueness === 'number' ? candidate.uniqueness : 0;
  const entropy = typeof candidate.entropy === 'number' ? candidate.entropy : 0;
  const stability = typeof candidate.stability === 'number' ? candidate.stability : 0.7;

  return clamp01((base * 0.55) + (uniqueness * 0.25) + (stability * 0.2) - (entropy * 0.3));
}

function formatDateIso(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function ensureNewSchema(spec) {
  // Hard fail if legacy schema is provided.
  if (spec?.tests || spec?.test_cases) {
    throw new Error(
      'Unsupported spec schema: legacy TestSuiteLoader format detected (tests/test_cases). ' +
      'Provide a target-based intent spec with root steps/assertions and intent.primary_action.'
    );
  }

  // Transitional legacy mode:
  // - We allow selector-based steps/assertions, but will convert selectors into registry entries
  //   with synthetic target keys when needed.
}

/**
 * Ground a target-based intent spec into locator-registry YAML.
 *
 * @param {Object} options
 * @param {string} options.specPath
 * @param {string|null} options.service
 * @param {string|null} [options.baseUrl]
 * @param {string|null} [options.storageStatePath]
 * @param {boolean} [options.headless=true]
 */
async function groundSpec(options) {
  const {
    specPath,
    service: cliService = null,
    baseUrl: explicitBaseUrl = null,
    storageStatePath = '.auth/user.json',
    headless = true,
    preSteps = null,
    autoPreSteps = true,
    autoPreStepsMax = 6,
  } = options || {};

  if (!specPath) {
    throw new Error('Missing required argument: specPath');
  }

  const absoluteSpecPath = path.resolve(specPath);
  if (!fs.existsSync(absoluteSpecPath)) {
    throw new Error(`Spec file not found: ${absoluteSpecPath}`);
  }

  const spec = yaml.load(fs.readFileSync(absoluteSpecPath, 'utf8'));
  ensureNewSchema(spec);

  const serviceName = cliService || spec?.metadata?.service || null;
  if (!serviceName) {
    throw new Error('Missing required service. Provide --service or set metadata.service in the spec.');
  }

  const primaryAction = spec?.intent?.primary_action || null;
  if (!primaryAction) {
    throw new Error('Missing required field: intent.primary_action');
  }

  const feature = spec?.intent?.feature ? slugify(spec.intent.feature) : slugify(primaryAction);
  if (!feature) {
    throw new Error('Unable to infer feature name. Provide intent.feature or intent.primary_action');
  }

  const targetRequests = buildTargetRequests(spec);
  if (targetRequests.length === 0) {
    throw new Error('No targets found. Provide steps[].target/assertions[].target or selector fields for legacy mode.');
  }

  const baseUrl = await resolveBaseUrl({ serviceName, explicitBaseUrl });
  if (!baseUrl) {
    throw new Error(
      `Unable to resolve base URL for service '${serviceName}'. ` +
      `Set services.yaml base_url for the service, or provide --base-url, or set BASE_URL env var.`
    );
  }

  const routesToVisit = getRoutesToVisit(spec);
  if (routesToVisit.length === 0) {
    throw new Error('No navigation routes found. Provide at least one step with action: goto and url: /path');
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

    // Visit each route in order (multi-page support)
    for (const route of routesToVisit) {
      const fullUrl = buildFullUrl(baseUrl, route);

      // domcontentloaded is reliable for initial render; networkidle is not reliable for SPAs
      // with long-polling/analytics and can cause grounding to hang.
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });

      // Best-effort: don't fail grounding if the app never reaches networkidle.
      try {
        await page.waitForLoadState('networkidle', { timeout: 8000 });
      } catch (_) {
        // Intentionally ignore.
      }

      await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });
    }

    const extractor = new CandidateExtractor({ page });

    async function clickBestEffortTarget(targetKey) {
      const candidates = await extractor.extractCandidatesForTarget(targetKey);

      // For auto-presteps, strongly prefer role-based button/link candidates.
      // These are more likely to represent actual UI triggers (like "Login").
      const preferredOrder = ['role', 'text', 'testid', 'label', 'css', 'xpath'];
      candidates.sort((a, b) => {
        const aRank = preferredOrder.indexOf(a.type);
        const bRank = preferredOrder.indexOf(b.type);
        if (aRank !== bRank) return aRank - bRank;
        // within type, prefer stronger semantic match and uniqueness
        return ((b.nameMatch || 0) - (a.nameMatch || 0)) || ((b.uniqueness || 0) - (a.uniqueness || 0));
      });

      for (const c of candidates.slice(0, 12)) {
        try {
          let locator;
          if (c.type === 'testid') locator = page.getByTestId(c.value);
          else if (c.type === 'role') locator = page.getByRole(c.value.role, c.value.options);
          else if (c.type === 'label') locator = page.getByLabel(c.value, { exact: false });
          else if (c.type === 'text') locator = page.getByText(c.value, { exact: false });
          else if (c.type === 'css') locator = page.locator(c.value);
          else if (c.type === 'xpath') locator = page.locator(`xpath=${c.value}`);
          else locator = page.locator(String(c.value || ''));

          const count = await locator.count().catch(() => 0);
          if (count <= 0) continue;

          await locator.first().click({ timeout: 15000 });

          // Small post-click stabilization to allow modal/panel to render.
          await page.waitForTimeout(400);

          return true;
        } catch (_) {
          // Try next candidate.
        }
      }

      return false;
    }

    async function applyAutoPreStepsFromSpec() {
      // Option A enforcement: grounding must be stateful.
      if (!autoPreSteps) {
        throw new Error(
          'Option A enforced: ground-spec requires autoPreSteps=true. ' +
          'This prevents grounding hidden elements against the wrong DOM state.'
        );
      }

      const steps = Array.isArray(spec?.steps) ? spec.steps : [];
      if (steps.length === 0) return;

      const failedClicks = [];

      // Execute a safe prefix of intent steps to reach the right UI state for grounding.
      // Limitations:
      // - We can only auto-execute goto/click/wait.
      // - We stop before any data-entry actions (fill/type/press/select/etc) to avoid side effects.
      let executed = 0;

      for (const step of steps) {
        if (!step || typeof step !== 'object') continue;
        if (executed >= autoPreStepsMax) break;

        const action = step.action;

        if (action === 'goto' && step.url) {
          // Already navigated by routesToVisit, but if the spec has a more specific URL, respect it.
          const fullUrl = buildFullUrl(baseUrl, step.url);
          await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
          executed++;
          continue;
        }

        if (action === 'click' && step.target) {
          const clicked = await clickBestEffortTarget(step.target);
          if (clicked) {
            executed++;
          } else {
            failedClicks.push(step.target);
          }
          continue;
        }

        if (action === 'wait') {
          // wait can be time-based or target-based. Prefer deterministic target-based waits.
          if (step.target) {
            // Best-effort: wait for any candidate for this target to become visible.
            const candidates = await extractor.extractCandidatesForTarget(step.target);
            const best = candidates[0];
            if (best) {
              try {
                let locator;
                if (best.type === 'testid') locator = page.getByTestId(best.value);
                else if (best.type === 'role') locator = page.getByRole(best.value.role, best.value.options);
                else if (best.type === 'label') locator = page.getByLabel(best.value, { exact: false });
                else if (best.type === 'text') locator = page.getByText(best.value, { exact: false });
                else if (best.type === 'css') locator = page.locator(best.value);
                else if (best.type === 'xpath') locator = page.locator(`xpath=${best.value}`);
                else locator = page.locator(String(best.value || ''));

                await locator.first().waitFor({ state: 'visible', timeout: 15000 });
                executed++;
              } catch (_) {
                // ignore
              }
            }
          } else if (typeof step.value === 'number') {
            await page.waitForTimeout(step.value);
            executed++;
          }
          continue;
        }

        // Stop before data-entry or other potentially destructive actions.
        if (['fill', 'type', 'press', 'check', 'uncheck', 'select'].includes(action)) {
          break;
        }
      }
    }

    // -----------------------------------------------------------------------
    // Auto pre-steps (Option A) + Optional manual pre-steps (escape hatch)
    // -----------------------------------------------------------------------
    // Auto-presteps: execute a safe prefix of intent steps to expose hidden UI states.
    await applyAutoPreStepsFromSpec();

    // Manual pre-steps are still supported as an escape hatch.
    if (Array.isArray(preSteps) && preSteps.length > 0) {
      for (const step of preSteps) {
        if (!step || typeof step !== 'object') continue;

        if (step.action === 'goto' && step.url) {
          const fullUrl = buildFullUrl(baseUrl, step.url);
          await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
          continue;
        }

        if (step.action === 'click' && step.selector) {
          await page.locator(step.selector).first().click({ timeout: 15000 });
          continue;
        }

        if ((step.action === 'waitFor' || step.action === 'wait_for') && step.selector) {
          await page.locator(step.selector).first().waitFor({ state: step.state || 'visible', timeout: 15000 });
          continue;
        }
      }
    }

    for (const req of targetRequests) {
      const targetKey = req.targetKey;

      // Transitional legacy mode: if a selector is provided, convert it directly into a registry entry.
      // This makes grounding deterministic even when the spec hasn't been migrated to target keys yet.
      if (req.selector) {
        const primary = inferPrimaryFromSelector(req.selector);
        if (!primary) {
          throw new Error(`Invalid legacy selector for target '${targetKey}': ${req.selector}`);
        }

        const entropy = primary.type === 'xpath'
          ? SelectorStabilityEvaluator.evaluate(primary.value)
          : SelectorStabilityEvaluator.evaluate(primary.value);

        await writeServiceRegistryEntry({
          service: serviceName,
          feature,
          targetKey,
          entry: {
            primary,
            fallback: [],
            score: 1,
            entropy: Number((entropy || 0).toFixed(4)),
            uniqueness: 1,
            stability: Number((1 - (entropy || 0)).toFixed(4)),
            confidence: 1,
            source: 'legacy_selector',
            lastValidated: formatDateIso(),
          },
        });

        continue;
      }

      const rawCandidates = await extractor.extractCandidatesForTarget(targetKey);

      const enriched = [];
      for (const candidate of rawCandidates) {
        const entropy = typeof candidate.entropy === 'number'
          ? candidate.entropy
          : SelectorStabilityEvaluator.evaluate(candidate.type === 'css' || candidate.type === 'xpath' ? (candidate.value || '') : '');

        const enrichedCandidate = {
          ...candidate,
          entropy,
        };

        const score = computeGroundingScore(enrichedCandidate);
        const confidence = computeConfidence(enrichedCandidate);

        enriched.push({
          ...enrichedCandidate,
          score,
          confidence,
        });
      }

      enriched.sort((a, b) => (b.score || 0) - (a.score || 0));

      const best = enriched[0];
      if (!best) {
        throw new Error(`No locator candidates found for target '${targetKey}'.`);
      }

      const fallbacks = enriched.slice(1, 6).map(c => ({
        type: c.type,
        value: c.value,
      }));

      await writeServiceRegistryEntry({
        service: serviceName,
        feature,
        targetKey,
        entry: {
          primary: { type: best.type, value: best.value },
          fallback: fallbacks,
          score: Number(best.score.toFixed(4)),
          entropy: Number((best.entropy || 0).toFixed(4)),
          uniqueness: Number((best.uniqueness || 0).toFixed(4)),
          stability: Number((best.stability || 0).toFixed(4)),
          confidence: Number((best.confidence || 0).toFixed(4)),
          source: 'lie',
          lastValidated: formatDateIso(),
        },
      });
    }

    return {
      service: serviceName,
      feature,
      targets: targetRequests.map(r => r.targetKey),
      registryPath: path.resolve(process.cwd(), 'locator-registry', 'services', serviceName, `${feature}.yaml`),
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  groundSpec,
};