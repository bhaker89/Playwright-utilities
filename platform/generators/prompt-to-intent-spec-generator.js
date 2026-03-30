const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { LLMClient } = require('./llm-client');
const { resolveFromRoot } = require('../core/workspace-root');

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
  // User is expected to refine targets for real apps.
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

async function generateIntentSpecFromPrompt(prompt, service, outputPath, options = {}) {
  const { llmProvider = process.env.AI_PROVIDER || 'groq' } = options;

  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Missing required argument: prompt');
  }

  if (!service || typeof service !== 'string') {
    throw new Error('Missing required argument: service');
  }

  const absoluteOutputPath = outputPath
    ? path.resolve(outputPath)
    : inferOutputPath(prompt);

  let spec;

  try {
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
      '- Keep actions within: goto, click, fill, type, press, check, uncheck, select, wait',
      '- For assertions types, prefer: visible, text',
    ].join('\n');

    const userPrompt = [
      `SERVICE: ${service}`,
      `PROMPT: ${prompt}`,
    ].join('\n');

    const response = await client.generate({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 1200,
      temperature: 0.2,
    });

    spec = yaml.load(response.content);
  } catch (_) {
    spec = buildFallbackIntentSpec(prompt, service);
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

module.exports = {
  generateIntentSpecFromPrompt,
};