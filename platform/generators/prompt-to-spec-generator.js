const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { TestSuiteLoader } = require('../parsers/test-suite-loader');
const { LLMClient } = require('./llm-client');
const { resolveFromRoot } = require('../core/workspace-root');

function extractFirstJsonObject(text) {
  if (!text) return null;

  // Common case: model wraps in markdown fences.
  const fenceMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch (_) {
      // continue
    }
  }

  // Fallback: try to find the first top-level JSON object by scanning braces.
  const firstBraceIndex = text.indexOf('{');
  if (firstBraceIndex === -1) return null;

  let depth = 0;
  for (let i = firstBraceIndex; i < text.length; i++) {
    const char = text[i];
    if (char === '{') depth++;
    if (char === '}') depth--;

    if (depth === 0) {
      const candidate = text.slice(firstBraceIndex, i + 1);
      try {
        return JSON.parse(candidate);
      } catch (_) {
        return null;
      }
    }
  }

  return null;
}

function slugifyPrompt(prompt) {
  return String(prompt || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .substring(0, 60) || 'spec';
}

function inferOutputPath(prompt) {
  const slug = slugifyPrompt(prompt);
  return resolveFromRoot('specs', `${slug}.yaml`);
}

function buildFallbackSuite(prompt, service) {
  // Minimal suite that satisfies TestSuiteLoader validation.
  // Runtime may still require the user to adjust selectors/URLs.
  return {
    name: `Generated - ${prompt.substring(0, 50)}`,
    description: 'Generated from prompt (fallback mode). Update selectors/URLs as needed.',
    metadata: {
      service: service || null,
    },
    config: {
      service: service || undefined,
      base_url: '',
      headless: true,
    },
    tests: [
      {
        name: 'Generated test',
        type: 'ui',
        steps: [
          {
            action: 'goto',
            url: '/',
          },
        ],
        assertions: [
          {
            type: 'ui_visible',
            selector: 'body',
          },
        ],
      },
    ],
  };
}

async function generateSpecFromPrompt(prompt, service, outputPath, options = {}) {
  const { llmProvider = process.env.AI_PROVIDER || 'groq' } = options;

  // Keep CLI usage simple: if keys are only present in config/.env.stag,
  // load them automatically (same spirit as generate-from-openapi).
  if (!process.env.GROQ_API_KEY && llmProvider === 'groq') {
    try {
      require('../../config/environment.config');
    } catch (_) {
      // Non-fatal: environment.config may not exist in all installs.
    }

    try {
      const dotenv = require('dotenv');
      dotenv.config({ path: path.resolve(__dirname, '../../config/.env.stag') });
    } catch (_) {
      // If dotenv isn't available, LLMClient will throw and we fall back.
    }
  }

  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Missing required argument: prompt');
  }

  if (!service || typeof service !== 'string') {
    throw new Error('Missing required argument: service');
  }

  const absoluteOutputPath = outputPath
    ? path.resolve(outputPath)
    : inferOutputPath(prompt);

  let suite;

  try {
    const client = new LLMClient(llmProvider);

    const systemPrompt = [
      'You are an expert test automation engineer.',
      'Return ONLY valid JSON. No markdown. No explanation.',
      '',
      'Your JSON MUST be compatible with this YAML test suite schema:',
      '- Root object must include: name (string), tests (array). description optional.',
      '- Root may include: config (object).',
      '- Each test in tests must include: name (string), assertions (non-empty array).',
      '- If test.type is "ui", it may include steps (array).',
      '- Allowed assertion types include: status_code, json_path, response_time, header, schema, contains, regex, ui_visible, ui_text.',
      '- For ui_visible/ui_text assertions, include selector (string). For ui_text, include expected (string).',
      '',
      'Also include root.metadata.service based on provided service context.',
    ].join('\n');

    const userPrompt = [
      `SERVICE: ${service || ''}`,
      `PROMPT: ${prompt}`,
      '',
      'Generate a practical UI YAML suite by default unless the prompt clearly indicates an API test.',
      'Prefer robust selectors (data-testid, role selectors, text selectors) when possible.',
    ].join('\n');

    const response = await client.generate({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 1200,
      temperature: 0.2,
    });

    suite = extractFirstJsonObject(response.content);

    if (!suite) {
      throw new Error('LLM did not return valid JSON');
    }
  } catch (error) {
    // If LLM is not configured (missing API keys) or returns bad output,
    // generate a minimal valid suite so the CLI still works.
    suite = buildFallbackSuite(prompt, service);
  }

  // Enforce metadata.service injection (priority: explicit arg)
  suite.metadata = suite.metadata || {};
  suite.metadata.service = service;

  // Also mirror into config.service for convenience (existing runner supports this)
  suite.config = suite.config || {};
  suite.config.service = suite.config.service || service;

  // Validate against existing TestSuiteLoader rules (schema compatibility)
  const loader = new TestSuiteLoader();
  loader.validateTestSuite(suite, absoluteOutputPath);

  // Hard requirement for service-aware execution
  if (!suite.metadata?.service) {
    throw new Error('Generated spec is missing required field: metadata.service');
  }

  // Ensure directory exists
  const outDir = path.dirname(absoluteOutputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const yamlText = yaml.dump(suite, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  fs.writeFileSync(absoluteOutputPath, yamlText, 'utf8');

  return {
    outputPath: absoluteOutputPath,
    suite,
  };
}

module.exports = {
  generateSpecFromPrompt,
  slugifyPrompt,
  inferOutputPath,
};