#!/usr/bin/env node

/**
 * Registry Validation CLI
 * 
 * Command: npm run validate-registry
 * 
 * Validates all locator registries in the project:
 * - Schema validation (required fields, correct types)
 * - Conflict detection (duplicates, overrides)
 * - Alias collisions
 * - Environment override correctness
 * - Namespace format validation
 * 
 * Exit codes:
 * 0 - All registries valid
 * 1 - Validation errors found
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { resolveFromRoot } = require('../core/workspace-root');
const { validateRegistrySchema } = require('../core/registry-schema-validator');
const { detectAllConflicts } = require('../core/registry-conflict-detector');

/**
 * Find all YAML files in a directory recursively
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
 * Validate all registries in the project
 */
async function validateAllRegistries() {
  console.log('\n🔍 Validating Locator Registries...\n');

  const registryRoot = resolveFromRoot('locator-registry');
  const yamlFiles = findYamlFiles(registryRoot);

  if (yamlFiles.length === 0) {
    console.log('⚠️  No registry files found');
    return { valid: true, filesChecked: 0 };
  }

  console.log(`Found ${yamlFiles.length} registry file(s)\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  let filesWithErrors = 0;
  const allRegistries = {};

  // Validate each file
  for (const filePath of yamlFiles) {
    const relativePath = getRelativePath(filePath);
    console.log(`Validating: ${relativePath}`);

    const registry = loadYamlFile(filePath);
    
    if (!registry) {
      filesWithErrors++;
      totalErrors++;
      console.log('  ✗ Failed to load file\n');
      continue;
    }

    allRegistries[relativePath] = registry;

    const validation = validateRegistrySchema(registry, {
      registryName: relativePath,
      strict: false,
    });

    if (!validation.valid) {
      filesWithErrors++;
      totalErrors += validation.errors.length;
      
      console.log(`  ✗ ${validation.errors.length} error(s) found:`);
      validation.errors.forEach(err => console.log(`    - ${err}`));
    }

    if (validation.warnings.length > 0) {
      totalWarnings += validation.warnings.length;
      console.log(`  ⚠ ${validation.warnings.length} warning(s):`);
      validation.warnings.forEach(warn => console.log(`    - ${warn}`));
    }

    if (validation.valid && validation.warnings.length === 0) {
      console.log('  ✓ Valid');
    }

    console.log('');
  }

  // Cross-registry conflict detection
  console.log('🔍 Checking for registry conflicts...\n');

  try {
    const conflicts = detectAllConflicts(allRegistries, { failOnConflict: false });

    if (conflicts.errors.length > 0) {
      totalErrors += conflicts.errors.length;
      console.log(`  ✗ ${conflicts.errors.length} conflict error(s):`);
      conflicts.errors.forEach(err => console.log(`    - ${err}`));
    }

    if (conflicts.warnings.length > 0) {
      totalWarnings += conflicts.warnings.length;
      console.log(`  ⚠ ${conflicts.warnings.length} conflict warning(s):`);
      conflicts.warnings.forEach(warn => console.log(`    - ${warn}`));
    }

    if (conflicts.errors.length === 0 && conflicts.warnings.length === 0) {
      console.log('  ✓ No conflicts detected');
    }
  } catch (error) {
    totalErrors++;
    console.log(`  ✗ Conflict detection failed: ${error.message}`);
  }

  console.log('');

  // Summary
  console.log('📊 Validation Summary:\n');
  console.log(`  Files checked: ${yamlFiles.length}`);
  console.log(`  Files with errors: ${filesWithErrors}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log(`  Total warnings: ${totalWarnings}\n`);

  if (totalErrors === 0) {
    console.log('✅ Registry validation passed!\n');
    return { valid: true, filesChecked: yamlFiles.length };
  } else {
    console.log('❌ Registry validation failed!\n');
    return { valid: false, filesChecked: yamlFiles.length };
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const result = await validateAllRegistries();
    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error during validation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateAllRegistries };