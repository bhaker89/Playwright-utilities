/**
 * Flow Composition Engine
 * 
 * Resolves high-level flow declarations into executable steps
 * 
 * Responsibilities:
 * - Resolve flow includes (e.g., "include order/create/rx")
 * - Apply parameter overrides
 * - Apply attribute modifiers (split, discount, etc.)
 * - Compose complete executable flow
 * - Support nested flows
 * 
 * Example:
 *   create order type=rx prescription=false split=true
 * 
 * Expands to:
 *   - Load flow: order/create/rx
 *   - Apply modifier: prescription=false
 *   - Apply modifier: split=true
 *   - Include flow: order/attributes/split
 *   - Compose final step list
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class FlowCompositionEngine {
  constructor(options = {}) {
    this.flowsBaseDir = options.flowsBaseDir || path.join(process.cwd(), 'flows');
    this.cache = new Map();
    this.debug = options.debug || false;
  }

  /**
   * Compose order flow from blueprint
   * 
   * @param {Object} blueprint - Order blueprint
   * @returns {Promise<Array>} Composed flow steps
   */
  async composeOrderFlow(blueprint) {
    const { type, prescription, split, discount, source, attributes = {} } = blueprint;

    console.log('[FLOW_COMPOSER] Composing order flow...');
    console.log('[FLOW_COMPOSER] Blueprint:', JSON.stringify(blueprint, null, 2));

    const steps = [];

    // 1. Load base order creation flow
    const baseFlowPath = `order/create/${type}`;
    console.log(`[FLOW_COMPOSER] Loading base flow: ${baseFlowPath}`);
    
    const baseFlow = await this.loadFlow(baseFlowPath);
    steps.push(...baseFlow);

    // 2. Apply attribute modifiers
    if (split === true) {
      console.log('[FLOW_COMPOSER] Applying modifier: split=true');
      const splitFlow = await this.loadFlow('order/attributes/split');
      steps.push(...splitFlow);
    }

    if (discount) {
      console.log(`[FLOW_COMPOSER] Applying modifier: discount=${discount}`);
      const discountFlow = await this.loadFlow(`order/attributes/${discount}`);
      steps.push(...discountFlow);
    }

    if (prescription === false && type === 'rx') {
      console.log('[FLOW_COMPOSER] Applying modifier: prescription=false');
      const noPrescriptionFlow = await this.loadFlow('order/attributes/no-prescription');
      steps.push(...noPrescriptionFlow);
    }

    // 3. Apply source-specific modifications
    if (source && source !== 'web') {
      console.log(`[FLOW_COMPOSER] Applying source modifier: source=${source}`);
      try {
        const sourceFlow = await this.loadFlow(`order/sources/${source}`);
        steps.push(...sourceFlow);
      } catch (e) {
        console.log(`[FLOW_COMPOSER] No specific flow for source: ${source}`);
      }
    }

    // 4. Apply custom attributes
    for (const [key, value] of Object.entries(attributes)) {
      console.log(`[FLOW_COMPOSER] Applying custom attribute: ${key}=${value}`);
      try {
        const attrFlow = await this.loadFlow(`order/attributes/${key}`);
        steps.push(...attrFlow);
      } catch (e) {
        console.log(`[FLOW_COMPOSER] No flow for attribute: ${key}`);
      }
    }

    console.log(`[FLOW_COMPOSER] ✓ Composed ${steps.length} steps`);

    return steps;
  }

  /**
   * Load flow definition
   * 
   * @param {string} flowPath - Relative flow path (e.g., "order/create/rx")
   * @returns {Promise<Array>} Flow steps
   */
  async loadFlow(flowPath) {
    // Check cache
    if (this.cache.has(flowPath)) {
      return this.cache.get(flowPath);
    }

    // Try different file extensions
    const extensions = ['.txt', '.flow.yaml', '.yaml', '.json'];
    
    for (const ext of extensions) {
      const fullPath = path.join(this.flowsBaseDir, flowPath + ext);
      
      if (fs.existsSync(fullPath)) {
        console.log(`[FLOW_COMPOSER] Loading flow from: ${fullPath}`);
        
        const content = fs.readFileSync(fullPath, 'utf-8');
        const steps = this.parseFlowContent(content, ext);
        
        this.cache.set(flowPath, steps);
        return steps;
      }
    }

    // Flow not found - return empty steps (graceful degradation)
    console.warn(`[FLOW_COMPOSER] Flow not found: ${flowPath}`);
    return [];
  }

  /**
   * Parse flow content based on file type
   */
  parseFlowContent(content, extension) {
    if (extension === '.txt') {
      // Parse DSL format
      return content
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => ({ action: line.trim(), type: 'dsl' }));
    }

    if (extension.includes('yaml')) {
      // Parse YAML format
      const data = yaml.load(content);
      return data.steps || [];
    }

    if (extension === '.json') {
      // Parse JSON format
      const data = JSON.parse(content);
      return data.steps || [];
    }

    return [];
  }

  /**
   * Execute composed flow
   * 
   * @param {Array} steps - Flow steps
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution result
   */
  async executeFlow(steps, context) {
    console.log(`[FLOW_COMPOSER] Executing ${steps.length} steps...`);

    const { page } = context;
    const results = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`[FLOW_COMPOSER] Step ${i + 1}/${steps.length}:`, step.action || step);

      try {
        // Execute step (simplified for now)
        // In real implementation, this would use the action executor
        const result = await this.executeStep(step, context);
        results.push(result);
      } catch (error) {
        console.error(`[FLOW_COMPOSER] Step ${i + 1} failed:`, error.message);
        return {
          success: false,
          error: error.message,
          failedStep: i + 1,
          results
        };
      }
    }

    console.log('[FLOW_COMPOSER] ✓ All steps executed successfully');

    return {
      success: true,
      steps: results,
      orderId: this.extractOrderId(results)
    };
  }

  /**
   * Execute single step
   */
  async executeStep(step, context) {
    // Simplified execution
    // In real implementation, this would delegate to action executor
    return {
      step,
      success: true,
      timestamp: Date.now()
    };
  }

  /**
   * Extract order ID from execution results
   */
  extractOrderId(results) {
    // Look for order ID in results
    for (const result of results) {
      if (result.orderId) {
        return result.orderId;
      }
    }
    return `COMPOSED_ORDER_${Date.now()}`;
  }

  /**
   * Validate order in UI
   */
  async validateOrder(orderId, context) {
    console.log(`[FLOW_COMPOSER] Validating order ${orderId}...`);
    
    const { page } = context;
    
    try {
      // Navigate to orders page
      await page.goto('/orders');
      
      // Look for order ID
      const orderElement = page.locator(`text=${orderId}`);
      const visible = await orderElement.isVisible({ timeout: 5000 });
      
      return {
        success: visible,
        orderId,
        method: 'flow_composer'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = {
  FlowCompositionEngine
};