const { logger } = require('../../utils/base/logger');

/**
 * ============================================================================
 * LLM CLIENT - Interface for Multiple LLM Providers
 * ============================================================================
 * 
 * Provides unified interface for:
 * - OpenAI (GPT-4)
 * - Anthropic (Claude)
 * - Groq (Fast Inference)
 * 
 * USAGE:
 * ------
 * ```javascript
 * const client = new LLMClient('openai');
 * const response = await client.generate({
 *   prompt: 'Generate test code...',
 *   maxTokens: 2000
 * });
 * ```
 * ============================================================================
 */

class LLMClient {
  constructor(provider = 'openai') {
    this.provider = provider;
    this.client = null;
    this._initialize();
  }

  /**
   * Initialize LLM provider client
   * @private
   */
  _initialize() {
    switch (this.provider) {
      case 'openai':
        this._initializeOpenAI();
        break;
      case 'claude':
      case 'anthropic':
        this._initializeAnthropic();
        break;
      case 'groq':
        this._initializeGroq();
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  /**
   * Initialize OpenAI client
   * @private
   */
  _initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    try {
      const { OpenAI } = require('openai');
      this.client = new OpenAI({ apiKey });
      logger.info('  OpenAI client initialized');
    } catch (error) {
      throw new Error('OpenAI package not installed. Run: npm install openai');
    }
  }

  /**
   * Initialize Anthropic client
   * @private
   */
  _initializeAnthropic() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    try {
      const { Anthropic } = require('@anthropic-ai/sdk');
      this.client = new Anthropic({ apiKey });
      logger.info('  Anthropic client initialized');
    } catch (error) {
      throw new Error('Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk');
    }
  }


  /**
   * Initialize Groq client
   * @private
   */
  _initializeGroq() {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }

    try {
      const { OpenAI } = require('openai');
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.groq.com/openai/v1'
      });
      logger.info('  Groq client initialized (OpenAI compatible)');
    } catch (error) {
      throw new Error('OpenAI package not installed. Run: npm install openai');
    }
  }

  /**
   * Generate text from prompt
   * @param {Object} options
   * @param {string} options.prompt - The prompt to generate from
   * @param {number} [options.maxTokens=2000] - Maximum tokens to generate
   * @param {number} [options.temperature=0.7] - Temperature for generation
   * @returns {Promise<Object>} Generated response
   */
  async generate(options) {
    const { prompt, maxTokens = 2000, temperature = 0.7 } = options;
    const providerName = this.provider.toUpperCase();

    logger.info(`  [${providerName}] Request started...`);
    logger.info(`  [${providerName}] Max tokens: ${maxTokens}, Temperature: ${temperature}`);

    const startTime = Date.now();

    try {
      let response;

      switch (this.provider) {
        case 'openai':
          response = await this._generateOpenAI(prompt, maxTokens, temperature, options.systemPrompt);
          break;
        case 'claude':
        case 'anthropic':
          response = await this._generateAnthropic(prompt, maxTokens, temperature, options.systemPrompt);
          break;
        case 'groq':
          response = await this._generateGroq(prompt, maxTokens, temperature, options.systemPrompt);
          break;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      logger.info(`  ✓ [${providerName}] Response received in ${duration}ms`);

      if (response.tokens) {
        logger.info(`  [${providerName}] Tokens: ${response.tokens.total} (Input: ${response.tokens.input}, Output: ${response.tokens.output})`);
      }

      if (response.estimatedCost > 0) {
        logger.info(`  [${providerName}] Estimated cost: $${response.estimatedCost}`);
      }

      return response;

    } catch (error) {
      logger.error(`  ❌ [${providerName}] Generation failed after ${Date.now() - startTime}ms`);
      logger.error(`  Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate using OpenAI
   * @private
   */
  async _generateOpenAI(prompt, maxTokens, temperature, systemPrompt) {
    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are an expert Playwright test automation engineer. Generate clean, maintainable test code following best practices.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    });

    const content = response.choices[0].message.content;
    const tokens = {
      input: response.usage.prompt_tokens,
      output: response.usage.completion_tokens,
      total: response.usage.total_tokens
    };
    const estimatedCost = this._calculateOpenAICost(tokens.total);

    return {
      content,
      tokens,
      estimatedCost,
      model: response.model
    };
  }

  /**
   * Generate using Anthropic Claude
   * @private
   */
  async _generateAnthropic(prompt, maxTokens, temperature, systemPrompt) {
    const response = await this.client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: maxTokens,
      temperature: temperature,
      system: systemPrompt || 'You are an expert Playwright test automation engineer.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0].text;
    const tokens = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens
    };
    const estimatedCost = this._calculateAnthropicCost(
      response.usage.input_tokens,
      response.usage.output_tokens
    );

    return {
      content,
      tokens,
      estimatedCost,
      model: response.model
    };
  }


  /**
   * Generate using Groq
   * @private
   */
  async _generateGroq(prompt, maxTokens, temperature, systemPrompt) {
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const response = await this.client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are an expert Playwright test automation engineer. Generate clean, maintainable test code following best practices.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    });

    const content = response.choices[0].message.content;
    const tokens = {
      input: response.usage.prompt_tokens,
      output: response.usage.completion_tokens,
      total: response.usage.total_tokens
    };

    return {
      content,
      tokens,
      estimatedCost: 0.0, // Groq prices are extremely low, often free/subsidized right now
      model: response.model
    };
  }

  /**
   * Calculate OpenAI cost (approximate)
   * @private
   */
  _calculateOpenAICost(totalTokens) {
    // GPT-4 Turbo pricing (approximate)
    const costPer1kTokens = 0.01; // $0.01 per 1K tokens (average)
    return ((totalTokens / 1000) * costPer1kTokens).toFixed(4);
  }

  /**
   * Calculate Anthropic cost (approximate)
   * @private
   */
  _calculateAnthropicCost(inputTokens, outputTokens) {
    // Claude pricing (approximate)
    const inputCostPer1k = 0.003; // $0.003 per 1K input tokens
    const outputCostPer1k = 0.015; // $0.015 per 1K output tokens

    const inputCost = (inputTokens / 1000) * inputCostPer1k;
    const outputCost = (outputTokens / 1000) * outputCostPer1k;

    return (inputCost + outputCost).toFixed(4);
  }
}

module.exports = { LLMClient };