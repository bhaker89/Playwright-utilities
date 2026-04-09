const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { LLMClient } = require('./llm-client');
const { resolveFromRoot } = require('../core/workspace-root');
const { normalizeStepsWithRegistry } = require('../core/dsl-normalizer');
const assertionEngine = require('../core/assertion-engine');

/**
 * Load registries for assertion injection
 * @param {string} service - Service name
 * @param {string} feature - Feature name
 * @returns {Promise<Object>} - Loaded registries
 */
async function loadRegistriesForService(service, feature) {
  try {
    const { loadAllRegistries } = require('../core/locator-registry-loader');
    return loadAllRegistries({ service, feature });
  } catch (err) {
    // Non-fatal: return empty registries if loading fails
    console.warn(`[REGISTRY] Warning: Could not load registries: ${err.message}`);
    return { core: {}, fallback: {}, healing: {}, child: {} };
  }
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .substring(0, 60) || 'intent_spec';
}

function inferOutputPath(prompt) {
  const slug = slugify(prompt);
  return resolveFromRoot('specs', 'intent', `${slug}.yaml`);
}

function buildFallbackIntentSpec(prompt, service) {
  // Minimal spec that satisfies canonical schema enough to allow grounding/run.
  // NOTE: This should be used only when explicitly allowed; otherwise we fail loudly.
  return {
    metadata: {
      service: service || null,
    },
    intent: {
      primary_action: prompt || 'ui_flow',
      feature: null,
      domain: null,
    },
    testSuite: {
      name: `Generated - ${String(prompt || '').slice(0, 50)}`,
      description: 'Generated from prompt (fallback). Update steps/assertions/targets as needed.',
    },
    steps: [
      { action: 'goto', url: '/' },
    ],
    assertions: [
      { type: 'visible', target: 'page_body' },
    ],
  };
}

function validateGeneratedIntentSpec(spec) {
  if (!spec || typeof spec !== 'object') {
    throw new Error('Generated spec is empty or not an object');
  }

  if (!spec?.testSuite?.name || typeof spec.testSuite.name !== 'string') {
    throw new Error('Generated spec is missing required field: testSuite.name');
  }

  const steps = Array.isArray(spec.steps) ? spec.steps : [];
  if (steps.length < 3) {
    throw new Error(`Generated spec has too few steps (${steps.length}). This is usually a generation failure.`);
  }

  const hasGoto = steps.some(s => s?.action === 'goto' && typeof s?.url === 'string' && s.url.trim());
  if (!hasGoto) {
    throw new Error('Generated spec must include at least one goto step with a non-empty url');
  }

  if (String(spec?.testSuite?.description || '').toLowerCase().includes('(fallback)')) {
    throw new Error('Generator produced fallback spec; refusing to write it in strict mode');
  }

  // Ensure canonical schema: no selectors in non-goto steps.
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    if (step.action === 'goto' || step.action === 'navigate') continue;

    if (step.selector) {
      throw new Error(`Generated spec contains a selector in step action='${step.action}'. Use target keys only.`);
    }

    if (!step.target || typeof step.target !== 'string') {
      throw new Error(`Generated spec step action='${step.action}' is missing required field: target`);
    }
  }

  const assertions = Array.isArray(spec.assertions) ? spec.assertions : [];
  for (const assertion of assertions) {
    if (!assertion || typeof assertion !== 'object') continue;
    if (assertion.selector) {
      throw new Error(`Generated spec contains a selector in assertion type='${assertion.type}'. Use target keys only.`);
    }
    if (!assertion.target || typeof assertion.target !== 'string') {
      throw new Error(`Generated assertion type='${assertion.type}' is missing required field: target`);
    }
  }
}

function validateIntentPromptText(promptText) {
  if (!promptText || typeof promptText !== 'string') {
    throw new Error('Prompt text is empty');
  }

  // Required section headers for QA prompt files.
  // Keep this plain-text and simple so QA can author it without YAML/JSON tooling.
  const requiredSections = [
    'ENVIRONMENT:',
    'SERVICE:',
    'AUTH:',
    'START STATE:',
    'HAPPY PATH STEPS:',
    'ASSERTIONS:',
    'CONSTRAINTS:',
  ];

  const missing = requiredSections.filter(header => !promptText.includes(header));
  if (missing.length > 0) {
    throw new Error(`Prompt is missing required section header(s): ${missing.join(', ')}`);
  }

  // Quick sanity: ensure steps list exists.
  const hasNumberedSteps = /\n\s*1\)\s+.+/m.test(promptText);
  if (!hasNumberedSteps) {
    throw new Error('HAPPY PATH STEPS must contain a numbered list starting with "1)"');
  }
}

async function generateYamlWithRepair({ client, userPrompt, systemPrompt, maxTokens, temperature }) {
  // Attempt 1: generate
  const first = await client.generate({
    prompt: userPrompt,
    systemPrompt,
    maxTokens,
    temperature,
  });

  try {
    return yaml.load(first.content);
  } catch (parseError) {
    // Attempt 2: ask the LLM to repair to valid YAML only
    const repairSystemPrompt = [
      'You are a strict YAML repair tool.',
      'You will be given invalid YAML that is supposed to represent an intent spec.',
      'Return ONLY valid YAML. No markdown. No explanations.',
      'Preserve user intent. Fix indentation, quoting, missing colons, and list formatting.',
      'Ensure schema includes: metadata.service, intent.primary_action, testSuite.name, steps, assertions.',
    ].join('\n');

    const repairUserPrompt = [
      'The YAML below is invalid. Repair it into valid YAML that matches the intent spec schema.',
      '---',
      String(first.content || ''),
      '---',
    ].join('\n');

    const repaired = await client.generate({
      prompt: repairUserPrompt,
      systemPrompt: repairSystemPrompt,
      maxTokens,
      temperature: 0.1,
    });

    return yaml.load(repaired.content);
  }
}

async function generateIntentSpecFromPrompt(prompt, service, outputPath, options = {}) {
  const {
    llmProvider = process.env.AI_PROVIDER || 'groq',
    allowFallback = false,
    strict = true,
    maxAttempts = 2,
    validatePrompt = true,
  } = options;

  if (validatePrompt) {
    validateIntentPromptText(prompt);
  }

  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Missing required argument: prompt');
  }

  if (!service || typeof service !== 'string') {
    throw new Error('Missing required argument: service');
  }

  // If outputPath is not provided, we will infer it AFTER spec generation.
  // This allows using spec.testSuite.name (when present) for a nicer filename
  // instead of slugifying the raw prompt.
  const outputPathArg = outputPath;

  let spec;

  const client = new LLMClient(llmProvider);

  const systemPrompt = [
    'You are an expert Playwright UI automation engineer.',
    'Return ONLY valid YAML. No markdown. No explanations.',
    '',
    'Generate a canonical intent spec YAML with this schema:',
    'metadata.service',
    'intent.primary_action',
    'intent.feature',
    'intent.domain',
    'testSuite.name',
    'testSuite.description',
    'steps[].action',
    'steps[].target',
    'steps[].value',
    'steps[].url',
    'assertions[].type',
    'assertions[].target',
    'assertions[].expected',
    '',
    'Rules:',
    '- steps must include at least one goto step with url',
    '- all non-goto UI actions must use steps[].target (no selectors)',
    '- assertions must use assertions[].target (no selectors)',
    '- Use concise snake_case target keys like: email_input, submit_button, dashboard_header',
    '- Keep actions within: goto, navigate, click, fill, type, press, check, uncheck, select, wait',
    '- You can also use natural language synonyms like: enter (→fill), tap (→click), open (→navigate)',
    '- For assertions types, prefer: visible, text',
    '',
    'Natural Language Support:',
    '- Steps can be written naturally: "fill email with test@example.com" or "click login button"',
    '- The normalization layer will convert these to canonical format automatically',
  ].join('\n');

  const userPrompt = [
    `SERVICE: ${service}`,
    `PROMPT: ${prompt}`,
  ].join('\n');

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      spec = await generateYamlWithRepair({
        client,
        userPrompt,
        systemPrompt,
        maxTokens: 1200,
        temperature: 0.2,
      });

      if (strict) {
        validateGeneratedIntentSpec(spec);
      }

      lastError = null;
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) {
    if (allowFallback) {
      spec = buildFallbackIntentSpec(prompt, service);
    } else {
      throw new Error(
        `Intent spec generation failed (provider='${llmProvider}'). ` +
        `Refusing to write fallback output in strict mode. Root cause: ${lastError.message}`
      );
    }
  }

  // Force metadata.service
  spec.metadata = spec.metadata || {};
  spec.metadata.service = service;

  // Minimal shape enforcement
  spec.intent = spec.intent || {};
  spec.intent.primary_action = spec.intent.primary_action || prompt;

  spec.steps = Array.isArray(spec.steps) ? spec.steps : [];
  if (spec.steps.length === 0) {
    spec.steps = [{ action: 'goto', url: '/' }];
  }

  // Ensure at least one goto step
  if (!spec.steps.some(s => s?.action === 'goto' && s?.url)) {
    spec.steps.unshift({ action: 'goto', url: '/' });
  }

  spec.assertions = Array.isArray(spec.assertions) ? spec.assertions : [];

  const absoluteOutputPath = outputPathArg
    ? path.resolve(outputPathArg)
    : (spec?.testSuite?.name
      ? resolveFromRoot('specs', 'intent', `${slugify(spec.testSuite.name)}.yaml`)
      : inferOutputPath(prompt));

  // Ensure directory exists
  const outDir = path.dirname(absoluteOutputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const yamlText = yaml.dump(spec, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });

  fs.writeFileSync(absoluteOutputPath, yamlText, 'utf8');

  return {
    outputPath: absoluteOutputPath,
    spec,
  };
}

/**
 * Generate Intent Spec from natural language DSL steps (bypasses LLM)
 * @param {Object} options
 * @param {string[]} options.steps - Array of natural language steps
 * @param {string} options.service - Service name
 * @param {string} options.feature - Feature name
 * @param {string} options.outputPath - Output path for spec
 * @param {Object} options.metadata - Additional metadata
 * @returns {Promise<Object>}
 */
async function generateIntentSpecFromDSL(options) {
  const {
    steps,
    service,
    feature,
    outputPath,
    metadata = {},
    assertions = [],
  } = options;

  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('DSL generation requires non-empty steps array');
  }

  if (!service || typeof service !== 'string') {
    throw new Error('DSL generation requires service name');
  }

  if (!feature || typeof feature !== 'string') {
    throw new Error('DSL generation requires feature name');
  }

  // Normalize steps using DSL normalizer
  let normalizedSteps;
  try {
    normalizedSteps = await normalizeStepsWithRegistry(steps, service, feature);
  } catch (err) {
    throw new Error(
      `DSL normalization failed: ${err.message}. ` +
      `Ensure locator registry exists at: locator-registry/services/${service}/${feature}.yaml`
    );
  }

  // PHASE 6: Inject assertions (compile-time enrichment)
  // Position: AFTER registry resolution, BEFORE intent spec generation
  let enrichedSteps;
  try {
    const registries = await loadRegistriesForService(service, feature);
    
    enrichedSteps = assertionEngine.injectAssertions(normalizedSteps, {
      service,
      feature,
      registries,
      flowPath: metadata.flowPath || null,
      env: process.env.TEST_ENV || 'default',
    }, {
      telemetry: process.env.PLATFORM_MODE === 'true',
    });

    if (process.env.PLATFORM_MODE === 'true') {
      const injectedCount = enrichedSteps.length - normalizedSteps.length;
      console.log(`[ASSERTION] Injected ${injectedCount} assertions into intent spec`);
    }
  } catch (err) {
    // Non-fatal: if assertion injection fails, continue with normalized steps
    console.warn(`[ASSERTION] Warning: Assertion injection failed: ${err.message}`);
    enrichedSteps = normalizedSteps;
  }

  // Build intent spec
  const spec = {
    metadata: {
      service,
      generated_by: 'dsl-normalizer',
      created_at: new Date().toISOString(),
      assertion_injection: true,
      ...metadata,
    },
    intent: {
      primary_action: metadata.primary_action || feature,
      feature,
      domain: metadata.domain || null,
    },
    testSuite: {
      name: metadata.testSuiteName || `${feature} flow`,
      description: metadata.description || `Generated from DSL for ${feature}`,
    },
    steps: enrichedSteps,
    assertions: assertions,
  };

  // Validate spec
  validateGeneratedIntentSpec(spec);

  // Determine output path
  const absoluteOutputPath = outputPath
    ? path.resolve(outputPath)
    : resolveFromRoot('specs', 'intent', `${slugify(feature)}.yaml`);

  // Ensure directory exists
  const outDir = path.dirname(absoluteOutputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Write YAML
  const yamlText = yaml.dump(spec, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });

  fs.writeFileSync(absoluteOutputPath, yamlText, 'utf8');

  return {
    outputPath: absoluteOutputPath,
    spec,
    normalizedSteps,
  };
}

module.exports = {
  generateIntentSpecFromPrompt,
  generateIntentSpecFromDSL,
  validateIntentPromptText,
};