#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Explain Flow CLI - Provides natural language explanation of TXT flows
 */
class FlowExplainer {
  constructor() {
    this.actionDescriptions = {
      navigate: 'Navigate to the specified URL or page',
      click: 'Click on the element',
      fill: 'Fill the input field with the specified value',
      type: 'Type text into the element',
      press: 'Press a keyboard key',
      select: 'Select an option from a dropdown',
      check: 'Check a checkbox',
      uncheck: 'Uncheck a checkbox',
      assert: 'Verify that a condition is true',
      wait: 'Wait for a condition or duration',
      hover: 'Hover over an element',
      'create order': 'Create an order using the OrderFactory',
      include: 'Include another flow file',
    };
  }

  /**
   * Parse and explain a single DSL line
   */
  explainLine(line, lineNumber) {
    // Skip comments and empty lines
    if (!line.trim() || line.trim().startsWith('#')) {
      return null;
    }

    try {
      // Basic tokenization
      const tokens = line.toLowerCase().trim().split(/\s+/);
      const verb = tokens[0];

      // Special handling for multi-word commands
      if (verb === 'create' && tokens[1] === 'order') {
        return this.explainOrderFactory(line, lineNumber);
      }

      if (verb === 'include' && line.includes(':flow:')) {
        const flowPath = line.split(':flow:')[1].trim();
        return {
          line: lineNumber,
          action: 'include',
          description: `Include and execute the flow from: ${flowPath}`,
          details: 'This is a flow composition step that imports another flow file.',
        };
      }

      // Standard actions
      const description = this.actionDescriptions[verb] || `Perform action: ${verb}`;
      
      if (verb === 'navigate' || verb === 'goto') {
        const urlMatch = line.match(/(?:to|goto)\s+(.+)/i);
        const url = urlMatch ? urlMatch[1] : 'specified URL';
        return {
          line: lineNumber,
          action: verb,
          description: `Navigate to: ${url}`,
          details: 'Opens the specified URL in the browser.',
        };
      }

      if (verb === 'click') {
        const targetMatch = line.match(/click\s+(.+)/i);
        const target = targetMatch ? targetMatch[1] : 'element';
        return {
          line: lineNumber,
          action: verb,
          description: `Click on: ${target}`,
          details: 'Locates the element using the registry and performs a click action.',
        };
      }

      if (verb === 'fill' || verb === 'type') {
        const match = line.match(/(?:fill|type)\s+(.+?)\s+with\s+(.+)/i);
        if (match) {
          const target = match[1];
          const value = match[2];
          return {
            line: lineNumber,
            action: verb,
            description: `Fill "${target}" with: ${value}`,
            details: 'Locates the input field and enters the specified value.',
          };
        }
      }

      if (verb === 'assert' || verb === 'verify') {
        const conditionMatch = line.match(/(?:assert|verify)\s+(.+)/i);
        const condition = conditionMatch ? conditionMatch[1] : 'condition';
        return {
          line: lineNumber,
          action: verb,
          description: `Verify that: ${condition}`,
          details: 'Checks if the specified condition is true. Test fails if assertion fails.',
        };
      }

      // Generic handling
      return {
        line: lineNumber,
        action: verb,
        description: `${description} (${line})`,
        details: 'Standard action performed via the action dictionary.',
      };

    } catch (error) {
      return {
        line: lineNumber,
        action: 'unknown',
        description: `[Error parsing line: ${error.message}]`,
        details: line,
      };
    }
  }

  /**
   * Explain OrderFactory syntax
   */
  explainOrderFactory(line, lineNumber) {
    const orderTypeMatch = line.match(/type=(\w+)/i);
    const orderType = orderTypeMatch ? orderTypeMatch[1] : 'unknown';
    
    const modifiers = [];
    if (line.includes('with prescription')) modifiers.push('includes prescription upload');
    if (line.includes('split-delivery') || line.includes('split delivery')) modifiers.push('split delivery across vendors');
    if (line.includes('coupon')) {
      const couponMatch = line.match(/coupon\s+["\']([^"\']+)["\']/i);
      if (couponMatch) {
        modifiers.push(`applies coupon code "${couponMatch[1]}"`);
      } else {
        modifiers.push('applies a coupon code');
      }
    }
    if (line.includes('no-prescription') || line.includes('no prescription')) modifiers.push('without prescription');

    const modifierText = modifiers.length > 0 ? ` (${modifiers.join(', ')})` : '';
    
    return {
      line: lineNumber,
      action: 'create order',
      description: `Create a ${orderType.toUpperCase()} order${modifierText}`,
      details: `Uses the OrderFactory to intelligently create an order. The platform will:
      • Select appropriate products (from dataset)
      • Add items to cart
      • Fill delivery address
      • Select payment method
      • Complete the checkout flow
      Strategy: Will use API_HYBRID mode if available, falling back to UI-only mode.`,
    };
  }

  /**
   * Explain an entire flow file
   */
  explainFlow(filePath) {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Flow file not found: ${fullPath}`);
    }

    console.log('📖 Flow Explanation');
    console.log('='.repeat(80));
    console.log(`File: ${fullPath}\n`);

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    
    const explanations = [];
    let stepNumber = 1;

    lines.forEach((line, idx) => {
      const explanation = this.explainLine(line, idx + 1);
      if (explanation) {
        explanation.stepNumber = stepNumber++;
        explanations.push(explanation);
      }
    });

    if (explanations.length === 0) {
      console.log('⚠️  No executable steps found in this flow (empty or only comments).');
      return;
    }

    // Print high-level summary
    console.log('📋 Flow Summary:');
    console.log(`  Total Steps: ${explanations.length}`);
    console.log(`  Total Lines: ${lines.length}`);
    
    const actionCounts = {};
    explanations.forEach((exp) => {
      actionCounts[exp.action] = (actionCounts[exp.action] || 0) + 1;
    });
    console.log(`  Action Breakdown: ${JSON.stringify(actionCounts, null, 2)}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('📝 Step-by-Step Explanation:\n');

    // Print detailed explanations
    explanations.forEach((exp) => {
      console.log(`Step ${exp.stepNumber} (Line ${exp.line}):`);
      console.log(`  Action: ${exp.action.toUpperCase()}`);
      console.log(`  Description: ${exp.description}`);
      if (exp.details) {
        console.log(`  Details: ${exp.details.replace(/\n/g, '\n           ')}`);
      }
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('✅ Explanation complete!');
    console.log('\n💡 Tip: Run "preview-flow" to see how parameters are resolved.');
  }
}

// CLI Handler
async function runExplainFlow(argv) {
  const explainer = new FlowExplainer();
  try {
    explainer.explainFlow(argv.dslFile);
    process.exit(0);
  } catch (error) {
    console.error('❌ Explain flow failed:', error.message);
    process.exit(1);
  }
}

module.exports = { runExplainFlow, FlowExplainer };

// Standalone execution
if (require.main === module) {
  const yargs = require('yargs');
  const argv = yargs(process.argv.slice(2))
    .usage('Usage: $0 <flow-file>')
    .demandCommand(1, 'Please provide a flow file path')
    .help('h')
    .alias('h', 'help')
    .argv;
  
  const explainer = new FlowExplainer();
  explainer.explainFlow(argv._[0]);
}