#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Quickstart CLI - Scaffolds folder structure for a new squad child repo
 */
class QuickstartScaffolder {
  constructor() {
    this.templateFiles = {
      'flows/example-login.txt': `# Example Login Flow
navigate to https://www.1mg.com
click login-button
fill email-input with default_user
fill password-input with default_user
click submit-button
assert user-logged-in`,
      
      'flows/example-order.txt': `# Example Order Flow
navigate to home
create order type=otc with coupon "HEALTH10"
assert order-id-visible`,
      
      'locator-registry/services/my-service.yaml': `# Locator Registry for my-service
# Follow naming conventions: semantic & functional names only

elements:
  login-button:
    selector: 'button[data-testid="login-btn"]'
    description: "Main login button on homepage"
    
  email-input:
    selector: 'input[name="email"]'
    description: "Email input field"
    
  password-input:
    selector: 'input[type="password"]'
    description: "Password input field"
    
  submit-button:
    selector: 'button[type="submit"]'
    description: "Form submit button"
    
  user-logged-in:
    selector: '.user-profile'
    description: "User profile indicator when logged in"`,
      
      'datasets/skus/my-products.json': `{
  "squad": "my-squad",
  "environment": "staging",
  "products": [
    {
      "sku_id": "SKU123456",
      "name": "Test Product 1",
      "price": 100,
      "in_stock": true,
      "category": "otc"
    }
  ]
}`,
      
      'datasets/users/my-users.json': `{
  "test_user_1": {
    "email": "qa+test1@1mg.com",
    "password": "TestPass123!",
    "phone": "+919876543210",
    "role": "customer"
  }
}`,
      
      'package.json': `{
  "name": "my-squad-automation",
  "version": "1.0.0",
  "description": "QA Automation for my squad using playwright-automation-core",
  "scripts": {
    "doctor": "npx playwright-automation-core doctor",
    "validate-flow": "npx playwright-automation-core validate-flow",
    "preview-flow": "npx playwright-automation-core preview-flow",
    "run-intent": "npx playwright-automation-core run-intent",
    "validate-datasets": "npx playwright-automation-core validate-datasets",
    "validate-assertions": "npx playwright-automation-core validate-assertions"
  },
  "dependencies": {
    "playwright-automation-core": "^1.0.0",
    "@playwright/test": "^1.40.0"
  }
}`,
      
      '.env.example': `# Environment Configuration
TEST_ENV=staging
BASE_URL=https://www.1mg.com

# Optional: Override dataset paths
# DATASET_PATH=./datasets`,
      
      'README.md': `# My Squad Automation

QA Automation suite powered by **playwright-automation-core**.

## Quick Start

1. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Verify setup**:
   \`\`\`bash
   npm run doctor
   \`\`\`

3. **Run example flow**:
   \`\`\`bash
   npm run preview-flow flows/example-login.txt
   npm run run-intent flows/example-login.txt
   \`\`\`

## Development Workflow

1. Write your flow in \`flows/my-feature.txt\`
2. Preview: \`npm run preview-flow flows/my-feature.txt\`
3. Validate: \`npm run validate-flow flows/my-feature.txt\`
4. Run: \`npm run run-intent flows/my-feature.txt\`

## Directory Structure

- \`flows/\` - Your TXT flow files
- \`locator-registry/services/\` - Element locators for your service
- \`datasets/\` - Test data (SKUs, users, etc.)

## Learn More

Read the full handbook in the core platform repository.
`
    };
  }

  /**
   * Create directory structure
   */
  createDirectories(rootPath) {
    const dirs = [
      'flows',
      'locator-registry/services',
      'datasets/skus',
      'datasets/users',
      'datasets/addresses',
      'datasets/payments',
    ];

    console.log('\n📁 Creating directory structure...');
    dirs.forEach((dir) => {
      const fullPath = path.join(rootPath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`  ✓ Created: ${dir}/`);
      } else {
        console.log(`  ⊙ Exists: ${dir}/`);
      }
    });
  }

  /**
   * Create template files
   */
  createTemplateFiles(rootPath) {
    console.log('\n📝 Creating template files...');
    
    Object.entries(this.templateFiles).forEach(([filePath, content]) => {
      const fullPath = path.join(rootPath, filePath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, content);
        console.log(`  ✓ Created: ${filePath}`);
      } else {
        console.log(`  ⊙ Exists: ${filePath}`);
      }
    });
  }

  /**
   * Run quickstart scaffolding
   */
  async run(targetPath) {
    const rootPath = path.resolve(targetPath || process.cwd());
    
    console.log('🚀 QA Automation Platform - Quickstart');
    console.log('='.repeat(80));
    console.log(`📍 Target directory: ${rootPath}`);
    
    // Check if directory exists
    if (!fs.existsSync(rootPath)) {
      console.log(`\n❌ Directory does not exist: ${rootPath}`);
      console.log('Create it first or run from an existing directory.');
      process.exit(1);
    }
    
    // Check if already initialized (package.json with playwright-automation-core)
    const packageJsonPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg.dependencies && pkg.dependencies['playwright-automation-core']) {
        console.log('\n⚠️  This directory is already initialized!');
        console.log('Skipping package.json creation to avoid conflicts.');
        console.log('Will only create missing directories and example files.\n');
      }
    }
    
    try {
      // Create directories
      this.createDirectories(rootPath);
      
      // Create template files
      this.createTemplateFiles(rootPath);
      
      console.log('\n✅ Quickstart complete!');
      console.log('\n📚 Next Steps:');
      console.log('  1. cd ' + path.relative(process.cwd(), rootPath));
      console.log('  2. npm install');
      console.log('  3. npm run doctor');
      console.log('  4. npm run preview-flow flows/example-login.txt');
      console.log('\n💡 Read the handbook for detailed instructions.');
      
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Quickstart failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI Handler
async function runQuickstart(argv) {
  const scaffolder = new QuickstartScaffolder();
  await scaffolder.run(argv.path);
}

module.exports = { runQuickstart, QuickstartScaffolder };

// Standalone execution
if (require.main === module) {
  const yargs = require('yargs');
  const argv = yargs(process.argv.slice(2))
    .usage('Usage: $0 [options]')
    .option('path', {
      alias: 'p',
      describe: 'Target directory for scaffolding (defaults to current directory)',
      type: 'string',
      default: process.cwd()
    })
    .help('h')
    .alias('h', 'help')
    .argv;
  
  const scaffolder = new QuickstartScaffolder();
  scaffolder.run(argv.path);
}