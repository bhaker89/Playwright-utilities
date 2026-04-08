#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * PHASE 4: Execution Surface Validator
 * 
 * Scans runtime execution pipeline for unauthorized direct locator usage.
 * 
 * FORBIDDEN PATTERNS (outside SmartLocator context):
 * - page.locator(
 * - page.getByRole(
 * - page.getByText(
 * - page.getByTestId(
 * - page.getByPlaceholder(
 * - page.getByLabel(
 * 
 * ALLOWED:
 * - smartLocator.resolve()
 * - LocatorOrchestrator methods
 * - Registry-backed resolution
 */

class ExecutionSurfaceValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    
    // Files to scan (runtime execution pipeline only)
    this.runtimeFiles = [
      'platform/core/intent-runner.js',
      'platform/engines/ui-engine.js',
      'platform/core/test-runner.js',
      'framework/locator-intelligence/locator-factory.js',
    ];
    
    // Forbidden patterns (direct Playwright locator usage)
    this.forbiddenPatterns = [
      /page\.locator\s*\(/,
      /page\.getByRole\s*\(/,
      /page\.getByText\s*\(/,
      /page\.getByTestId\s*\(/,
      /page\.getByPlaceholder\s*\(/,
      /page\.getByLabel\s*\(/,
      /page\.getByAltText\s*\(/,
      /page\.getByTitle\s*\(/,
    ];
    
    // Allowed contexts (exceptions)
    this.allowedContexts = [
      'LocatorOrchestrator',
      'SmartLocator',
      'locator-orchestrator.js',
      'locator-factory.js',
      // Smoke check in intent-runner is allowed (strict validation)
      'strict checks for common mis-grounding',
    ];
  }
  
  async validate() {
    console.log('🔍 Scanning execution pipeline for unauthorized locator usage...\n');
    
    for (const filePath of this.runtimeFiles) {
      await this.scanFile(filePath);
    }
    
    this.printResults();
    
    if (this.errors.length > 0) {
      console.error('\n❌ Validation FAILED. Fix errors above.');
      process.exit(1);
    }
    
    console.log('\n✅ Validation PASSED. No unauthorized locator usage detected.');
    process.exit(0);
  }
  
  async scanFile(relativeFilePath) {
    const absolutePath = path.resolve(process.cwd(), relativeFilePath);
    
    if (!fs.existsSync(absolutePath)) {
      this.warnings.push({
        file: relativeFilePath,
        message: 'File not found (may be optional)',
      });
      return;
    }
    
    const content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Skip if line is in allowed context
      const isAllowedContext = this.allowedContexts.some(ctx => 
        line.includes(ctx) || lines[index - 1]?.includes(ctx) || lines[index + 1]?.includes(ctx)
      );
      
      if (isAllowedContext) {
        return;
      }
      
      // Check for forbidden patterns
      this.forbiddenPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          // Additional check: skip if it's inside a comment
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
            return;
          }
          
          this.errors.push({
            file: relativeFilePath,
            line: lineNumber,
            code: line.trim(),
            message: `Forbidden direct locator usage detected. Use SmartLocator/LocatorOrchestrator.`,
            pattern: pattern.toString(),
          });
        }
      });
    });
  }
  
  printResults() {
    console.log('='.repeat(80));
    console.log('EXECUTION SURFACE VALIDATION RESULTS');
    console.log('='.repeat(80));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✓ No issues found');
      return;
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach((error, idx) => {
        console.log(`\n${idx + 1}. ${error.file}:${error.line}`);
        console.log(`   ${error.code}`);
        console.log(`   ↳ ${error.message}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach((warning, idx) => {
        console.log(`\n${idx + 1}. ${warning.file}`);
        console.log(`   ${warning.message}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

// Run validator
if (require.main === module) {
  const validator = new ExecutionSurfaceValidator();
  validator.validate().catch(error => {
    console.error('Validator crashed:', error);
    process.exit(1);
  });
}

module.exports = { ExecutionSurfaceValidator };