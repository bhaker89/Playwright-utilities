#!/usr/bin/env node

/**
 * Assertion Validation CLI
 * 
 * Command: npm run validate-assertions
 * 
 * Validates assertion definitions in:
 * - Registry entries (asserts field)
 * - Flow metadata files (*.meta.yaml)
 * 
 * Checks:
 * - Missing assertion targets
 * - Invalid assertion schema
 * - Duplicate assertion definitions
 * 
 * Exit codes:
 * 0 - All assertions valid
 * 1 - Validation errors found
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { resolveFromRoot } = require('../core/workspace-root');
const { validateAssertions } = require('../core/registry-schema-validator');

/**
 * Find all YAML files recursively
 */
function findYamlFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findYamlFiles(filePath, fileList);
    } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Load YAML file safely
 */
function loadYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    console.error(`Failed to parse ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Get relative path from workspace root
 */
function getRelativePath(filePath) {
  const root = resolveFromRoot('.');
  return path.relative(root, filePath);
}

/**
 * Validate registry assertions
 */
async function validateRegistryAssertions() {
  console.log('\n🔍 Validating Registry Assertions...\n');

  const registryRoot = resolveFromRoot('locator-registry');
  const yamlFiles = findYamlFiles(registryRoot);

  if (yamlFiles.length === 0) {
    console.log('⚠️  No registry files found');
    return { valid: true, errors: 0 };
  }

  console.log(`Found ${yamlFiles.length} registry file(s)\n`);

  let totalErrors = 0;
  let entriesWithAssertions = 0;

  for (const filePath of yamlFiles) {
    const relativePath = getRelativePath(filePath);
    const registry = loadYamlFile(filePath);
    
    if (!registry) {
      totalErrors++;
      continue;
    }

    for (const [targetKey, entry] of Object.entries(registry)) {
      if (!entry.asserts) {
        continue;
      }

      entriesWithAssertions++;

      const validation = validateAssertions(entry.asserts, `${relativePath}.${targetKey}.asserts`);

      if (validation.length > 0) {
        totalErrors += validation.length;
        console.log(`❌ ${relativePath} → ${targetKey}:`);
        validation.forEach(err => console.log(`   ${err}`));
      }
    }
  }

  console.log(`✓ Validated ${entriesWithAssertions} registry entries with assertions\n`);

  return { valid: totalErrors === 0, errors: totalErrors };
}

/**
 * Validate flow metadata assertions
 */
async function validateFlowMetadataAssertions() {
  console.log('🔍 Validating Flow Metadata Assertions...\n');

  const flowsRoot = resolveFromRoot('flows');
  
  if (!fs.existsSync(flowsRoot)) {
    console.log('⚠️  No flows directory found\n');
    return { valid: true, errors: 0 };
  }

  const metaFiles = findYamlFiles(flowsRoot).filter(f => f.endsWith('.meta.yaml'));

  if (metaFiles.length === 0) {
    console.log('⚠️  No flow metadata files found\n');
    return { valid: true, errors: 0 };
  }

  console.log(`Found ${metaFiles.length} flow metadata file(s)\n`);

  let totalErrors = 0;

  for (const filePath of metaFiles) {
    const relativePath = getRelativePath(filePath);
    const metadata = loadYamlFile(filePath);
    
    if (!metadata) {
      totalErrors++;
      console.log(`❌ ${relativePath}: Failed to load`);
      continue;
    }

    if (!metadata.asserts) {
      console.log(`⚠️  ${relativePath}: No assertions defined`);
      continue;
    }

    // Validate assertions format
    const asserts = Array.isArray(metadata.asserts) ? metadata.asserts : [metadata.asserts];
    
    for (let i = 0; i < asserts.length; i++) {
      const assertion = asserts[i];
      
      if (typeof assertion !== 'string' && typeof assertion !== 'object') {
        totalErrors++;
        console.log(`❌ ${relativePath}: asserts[${i}] must be string or object`);
      }

      if (typeof assertion === 'object' && !assertion.target) {
        totalErrors++;
        console.log(`❌ ${relativePath}: asserts[${i}] must have 'target' field`);
      }
    }

    if (totalErrors === 0) {
      console.log(`✓ ${relativePath} (${asserts.length} assertions)`);
    }
  }

  console.log('');

  return { valid: totalErrors === 0, errors: totalErrors };
}

/**
 * Main validation
 */
async function main() {
  try {
    console.log('\n📋 Assertion Validation Report\n');
    console.log('='.repeat(50));

    const registryResult = await validateRegistryAssertions();
    const flowResult = await validateFlowMetadataAssertions();

    const totalErrors = registryResult.errors + flowResult.errors;

    console.log('='.repeat(50));
    console.log('\n📊 Summary:\n');
    console.log(`  Registry assertion errors: ${registryResult.errors}`);
    console.log(`  Flow metadata errors: ${flowResult.errors}`);
    console.log(`  Total errors: ${totalErrors}\n`);

    if (totalErrors === 0) {
      console.log('✅ Assertion validation passed!\n');
      process.exit(0);
    } else {
      console.log('❌ Assertion validation failed!\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error during validation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateRegistryAssertions, validateFlowMetadataAssertions };