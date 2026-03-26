const axios = require('axios');
const { logger } = require('../../utils/base/logger');
const { env } = require('../../config/environment.config');

/**
 * AI Engine for the Enterprise QA Platform
 * Handles Test Generation and Self-Healing Locators using LLMs
 */
class AiEngine {
    constructor() {
        this.provider = env.AI_PROVIDER || 'anthropic';

        if (this.provider === 'groq') {
            this.apiKey = env.GROQ_API_KEY || env.AI_API_KEY;
            this.model = env.GROQ_MODEL || env.AI_MODEL || 'llama-3.3-70b-versatile';
        } else {
            this.apiKey = env.AI_API_KEY;
            this.model = env.AI_MODEL || (this.provider === 'anthropic' ? 'claude-3-sonnet-20240229' : 'gpt-4-turbo');
        }
    }

    /**
     * Heal a broken locator by analyzing page HTML
     */
    async healLocator(brokenLocator, error, pageSnapshot) {
        if (!this.apiKey) {
            logger.warn('AI: Skipping healing - no API key set. Returning DEMO mock selector.');
            // Fallback for the demo if no key is supplied at all
            return 'text="Quick Order"';
        }

        logger.info(`AI: Attempting to heal locator: ${brokenLocator}`);

        const systemPrompt = `You are a Test Automation Expert. Your task is to find a working Playwright selector for an element that has changed.
        The original selector was: "${brokenLocator}"
        The error was: "${error}"
        
        Return ONLY a valid string selector (e.g. "text=Login", ".submit-btn", "button:has-text('Save')") or "NULL" if not found.
        Do not explain anything.`;

        // Strip scripts, styles, and SVG from the HTML to drastically reduce token size
        const cleanHTML = pageSnapshot
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '[SVG]')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/\s+/g, ' ');

        const snippet = cleanHTML.substring(0, 15000);
        console.log(`\n\n--- [AiEngine] DEBUG: Sending HTML snippet of length: ${snippet.length} ---`);

        const userPrompt = `Page HTML Snippet:\n${snippet}`;

        try {
            const response = await this._callLLM(systemPrompt, userPrompt);
            console.log(`\n\n--- [AiEngine] DEBUG: Raw LLM Response ---\n${response}\n---------------------------------------\n`);

            const healed = response.trim().replace(/^"|"$/g, '').replace(/^`|`$/g, '');

            if (healed === 'NULL' || healed === '' || healed === 'null') {
                logger.info('AI: Could not find a suitable replacement.');
                return null;
            }

            logger.info(`AI: Recommended new locator: ${healed}`);
            return healed;
        } catch (err) {
            logger.error('AI: Healing failed', err);
            return null;
        }
    }

    /**
     * Generate a test suite from a natural language prompt
     */
    async generateTestFromPrompt(prompt) {
        if (!this.apiKey) {
            logger.warn('AI: API Key not set. Returning mock test for demonstration.');
            return this._getMockTest(prompt);
        }

        const systemPrompt = `You are an SDET. Convert the user's request into a Platform YAML Test Suite.
        Output MUST be valid YAML following this structure:
        name: [Descriptive Name]
        description: [Description]
        tests:
          - name: [Test Name]
            type: api/ui
            steps:
              - action: [click/fill/goto/api_call]
                # for UI: selector, value
                # for API: method, url, body
            assertions:
              - type: [status_code/text/visible]
                expected: [value]
        
        Return ONLY the YAML content. No markdown code blocks.`;

        try {
            const response = await this._callLLM(systemPrompt, prompt);
            const yaml = require('js-yaml');
            return yaml.load(response);
        } catch (err) {
            logger.error('AI: Generation failed', err);
            return null;
        }
    }

    async _callLLM(system, user) {
        if (this.provider === 'anthropic') {
            return await this._callAnthropic(system, user);
        } else if (this.provider === 'groq') {
            return await this._callGroq(system, user);
        } else {
            return await this._callOpenAI(system, user);
        }
    }

    async _callGroq(system, user) {
        // Groq uses an OpenAI-compatible API structure
        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return res.data.choices[0].message.content;
    }

    async _callAnthropic(system, user) {
        const res = await axios.post('https://api.anthropic.com/v1/messages', {
            model: this.model,
            max_tokens: 1024,
            system: system,
            messages: [{ role: 'user', content: user }]
        }, {
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
        });
        return res.data.content[0].text;
    }

    async _callOpenAI(system, user) {
        const res = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return res.data.choices[0].message.content;
    }

    _getMockTest(prompt) {
        // Fallback mock for demo if no key
        return {
            name: 'AI Generated Suite',
            description: `Generated from: ${prompt}`,
            tests: [{
                name: 'Sample Test',
                type: 'api',
                method: 'GET',
                url: 'https://api.stag.1mg.com/health',
                assertions: [{ type: 'status_code', expected: 200 }]
            }]
        };
    }
}

module.exports = new AiEngine();
