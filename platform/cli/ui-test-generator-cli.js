#!/usr/bin/env node

const { UITestGenerator } = require('../generators/ui-test-code-generator');
const { logger } = require('../../utils/base/logger');
const readline = require('readline');

/**
 * CLI Tool for UI Test Generator
 * Usage: node platform/cli/ui-test-generator-cli.js
 */

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          🎭 UI Test Generator - Natural Language             ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('📝 Describe the test you want to create in natural language.\n');
    console.log('Example prompts:');
    console.log('  - "Test login flow with valid and invalid credentials"');
    console.log('  - "Verify user can add items to cart and checkout"');
    console.log('  - "Test password reset flow from forgot password link"\n');

    // Get test description
    const prompt = await question('💬 Describe your test: ');
    
    if (!prompt.trim()) {
        console.log('❌ No prompt provided. Exiting...');
        rl.close();
        return;
    }

    // Get format preference
    console.log('\n📦 Choose output format:');
    console.log('  1. Playwright with Page Objects (recommended)');
    console.log('  2. Playwright without Page Objects');
    console.log('  3. YAML (No-Code)');
    console.log('  4. Both Playwright and YAML');
    
    const formatChoice = await question('\nSelect (1-4): ');
    
    let format = 'playwright';
    let withPageObjects = true;
    
    switch (formatChoice.trim()) {
        case '1':
            format = 'playwright';
            withPageObjects = true;
            break;
        case '2':
            format = 'playwright';
            withPageObjects = false;
            break;
        case '3':
            format = 'yaml';
            withPageObjects = false;
            break;
        case '4':
            format = 'both';
            withPageObjects = true;
            break;
        default:
            console.log('⚠️  Invalid choice. Using default: Playwright with Page Objects');
            format = 'playwright';
            withPageObjects = true;
    }

    // Get self-healing preference
    const healingChoice = await question('\n🩹 Enable self-healing? (Y/n): ');
    const withSelfHealing = !healingChoice.toLowerCase().startsWith('n');

    // Get comprehensive coverage preferences
    console.log('\n📊 Test Coverage Options:');
    const includeNegative = await question('  Generate negative test cases (invalid inputs, errors)? (Y/n): ');
    const includeEdge = await question('  Generate edge cases (boundaries, empty states)? (Y/n): ');
    const includeErrorValidation = await question('  Validate error messages? (Y/n): ');
    
    const coverageLevel = await question('\n🎯 Coverage level (basic/comprehensive/custom): ');
    
    // Build coverage options
    const coverageOptions = {
        includeNegative: !includeNegative.toLowerCase().startsWith('n'),
        includeEdge: !includeEdge.toLowerCase().startsWith('n'),
        includeErrorValidation: !includeErrorValidation.toLowerCase().startsWith('n'),
        level: coverageLevel.trim().toLowerCase() || 'basic'
    };

    rl.close();

    console.log('\n🚀 Generating tests...\n');

    // Display coverage summary
    if (coverageOptions.level !== 'basic') {
        console.log('📋 Coverage Configuration:');
        console.log(`  ✓ Negative Tests: ${coverageOptions.includeNegative ? 'Enabled' : 'Disabled'}`);
        console.log(`  ✓ Edge Cases: ${coverageOptions.includeEdge ? 'Enabled' : 'Disabled'}`);
        console.log(`  ✓ Error Validation: ${coverageOptions.includeErrorValidation ? 'Enabled' : 'Disabled'}`);
        console.log(`  ✓ Level: ${coverageOptions.level}\n`);
    }

    // Generate tests
    const generator = new UITestGenerator();
    const result = await generator.generateFromPrompt(prompt, {
        format,
        withPageObjects,
        withSelfHealing,
        coverage: coverageOptions
    });

    if (result.success) {
        console.log('\n✅ Generation completed successfully!');
        
        // Offer to run the test
        const runChoice = await new Promise((resolve) => {
            const rl2 = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl2.question('\n▶️  Run the generated test now? (y/N): ', (answer) => {
                rl2.close();
                resolve(answer);
            });
        });

        if (runChoice.toLowerCase().startsWith('y')) {
            const testFile = result.files.playwright || result.files.yaml;
            console.log(`\n🧪 Running: ${testFile}\n`);
            
            const { spawn } = require('child_process');
            const testProcess = spawn('npx', ['playwright', 'test', testFile], {
                stdio: 'inherit',
                shell: true
            });

            testProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('\n✅ Test execution completed successfully!');
                } else {
                    console.log(`\n⚠️  Test execution finished with code ${code}`);
                }
            });
        }
    } else {
        console.log('\n❌ Generation failed:', result.error);
        process.exit(1);
    }
}

// Run CLI
main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
});