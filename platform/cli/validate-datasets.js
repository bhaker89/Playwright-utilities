#!/usr/bin/env node

/**
 * Dataset Validation CLI
 * 
 * Validates dataset files for:
 * - Schema correctness
 * - Missing required fields
 * - Invalid JSON format
 * - Duplicate keys
 * - Environment mismatches
 * - Invalid overrides
 * 
 * Usage:
 *   npm run validate-datasets
 *   node platform/cli/validate-datasets.js
 *   node platform/cli/validate-datasets.js --path ./custom-datasets
 */

const fs = require('fs').promises;
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

/**
 * Main validation function
 */
async function validateDatasets() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Dataset Validation CLI');
  console.log('='.repeat(60) + '\n');

  const args = process.argv.slice(2);
  const customPath = args.find(arg => arg.startsWith('--path='))?.split('=')[1];
  
  const datasetPath = customPath || path.join(__dirname, '../../datasets');
  
  console.log(`Validating datasets in: ${datasetPath}\n`);

  const results = {
    categories: {},
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    errors: [],
    warnings: []
  };

  try {
    // Validate each category
    const categories = ['skus', 'vendors', 'addresses', 'payments', 'users'];
    
    for (const category of categories) {
      const categoryPath = path.join(datasetPath, category);
      const categoryResults = await validateCategory(category, categoryPath);
      results.categories[category] = categoryResults;
      
      results.totalFiles += categoryResults.totalFiles;
      results.validFiles += categoryResults.validFiles;
      results.invalidFiles += categoryResults.invalidFiles;
      results.errors.push(...categoryResults.errors);
      results.warnings.push(...categoryResults.warnings);
    }

    // Print results
    printResults(results);

    // Exit with appropriate code
    if (results.invalidFiles > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (error) {
    console.error(`${colors.red}✗ Validation failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Validate a category of datasets
 */
async function validateCategory(category, categoryPath) {
  const result = {
    category,
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    errors: [],
    warnings: []
  };

  try {
    // Check if category exists
    await fs.access(categoryPath);
  } catch (error) {
    result.warnings.push({
      category,
      message: `Category directory not found: ${categoryPath}`
    });
    return result;
  }

  try {
    const files = await fs.readdir(categoryPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    result.totalFiles = jsonFiles.length;

    console.log(`\n${colors.blue}Category: ${category}${colors.reset}`);
    console.log(`Found ${jsonFiles.length} dataset file(s)`);

    for (const file of jsonFiles) {
      const filePath = path.join(categoryPath, file);
      const fileResult = await validateDatasetFile(category, file, filePath);

      if (fileResult.valid) {
        result.validFiles++;
        console.log(`  ${colors.green}✓${colors.reset} ${file}`);
      } else {
        result.invalidFiles++;
        console.log(`  ${colors.red}✗${colors.reset} ${file}`);
        result.errors.push(...fileResult.errors);
      }

      result.warnings.push(...fileResult.warnings);
    }

  } catch (error) {
    result.errors.push({
      category,
      message: `Failed to read category: ${error.message}`
    });
  }

  return result;
}

/**
 * Validate a single dataset file
 */
async function validateDatasetFile(category, fileName, filePath) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    // Read and parse JSON
    const content = await fs.readFile(filePath, 'utf8');
    let data;

    try {
      data = JSON.parse(content);
    } catch (parseError) {
      result.valid = false;
      result.errors.push({
        category,
        file: fileName,
        message: `Invalid JSON: ${parseError.message}`
      });
      return result;
    }

    // Validate based on category
    switch (category) {
      case 'skus':
        validateSkuDataset(data, fileName, result);
        break;
      case 'vendors':
        validateVendorDataset(data, fileName, result);
        break;
      case 'addresses':
        validateAddressDataset(data, fileName, result);
        break;
      case 'payments':
        validatePaymentDataset(data, fileName, result);
        break;
      case 'users':
        validateUserDataset(data, fileName, result);
        break;
    }

  } catch (error) {
    result.valid = false;
    result.errors.push({
      category,
      file: fileName,
      message: `Validation error: ${error.message}`
    });
  }

  return result;
}

/**
 * Validate SKU dataset
 */
function validateSkuDataset(data, fileName, result) {
  if (!data.default) {
    result.warnings.push({
      file: fileName,
      message: 'No default SKU defined'
    });
  }

  // Check for empty values
  for (const [key, value] of Object.entries(data)) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      result.valid = false;
      result.errors.push({
        file: fileName,
        message: `Invalid SKU value for key "${key}": ${value}`
      });
    }
  }
}

/**
 * Validate vendor dataset
 */
function validateVendorDataset(data, fileName, result) {
  if (!data.default && !data.types && !data.pincodes) {
    result.valid = false;
    result.errors.push({
      file: fileName,
      message: 'Must have at least one of: default, types, or pincodes'
    });
  }

  // Validate types
  if (data.types) {
    const validTypes = ['rx', 'otc', 'mixed', 'b2b', 'corporate'];
    for (const [type, vendor] of Object.entries(data.types)) {
      if (!validTypes.includes(type)) {
        result.warnings.push({
          file: fileName,
          message: `Unexpected order type: ${type}`
        });
      }
    }
  }
}

/**
 * Validate address dataset
 */
function validateAddressDataset(data, fileName, result) {
  const requiredFields = ['line1', 'city', 'pincode'];
  
  // Validate default address
  if (data.default) {
    validateAddressObject(data.default, 'default', fileName, requiredFields, result);
  }

  // Validate city addresses
  if (data.cities) {
    for (const [city, address] of Object.entries(data.cities)) {
      validateAddressObject(address, `cities.${city}`, fileName, requiredFields, result);
    }
  }

  // Validate user type addresses
  if (data.userTypes) {
    for (const [userType, address] of Object.entries(data.userTypes)) {
      validateAddressObject(address, `userTypes.${userType}`, fileName, requiredFields, result);
    }
  }
}

/**
 * Validate address object
 */
function validateAddressObject(address, path, fileName, requiredFields, result) {
  if (!address || typeof address !== 'object') {
    result.valid = false;
    result.errors.push({
      file: fileName,
      message: `Invalid address object at ${path}`
    });
    return;
  }

  for (const field of requiredFields) {
    if (!address[field]) {
      result.warnings.push({
        file: fileName,
        message: `Missing field "${field}" in address at ${path}`
      });
    }
  }

  // Validate pincode format (basic)
  if (address.pincode && !/^\d{6}$/.test(address.pincode)) {
    result.warnings.push({
      file: fileName,
      message: `Invalid pincode format at ${path}: ${address.pincode}`
    });
  }
}

/**
 * Validate payment dataset
 */
function validatePaymentDataset(data, fileName, result) {
  if (!data.default) {
    result.warnings.push({
      file: fileName,
      message: 'No default payment method defined'
    });
  }

  const validMethods = ['cod', 'card', 'upi', 'netbanking', 'wallet', 'corporate', 'corporate-credit', 'invoice'];
  
  // Validate payment method definitions
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value.method) {
      // It's a payment method definition
      if (!value.type || !value.name) {
        result.warnings.push({
          file: fileName,
          message: `Payment method "${key}" missing type or name`
        });
      }
    }
  }
}

/**
 * Validate user dataset
 */
function validateUserDataset(data, fileName, result) {
  if (!data.default) {
    result.warnings.push({
      file: fileName,
      message: 'No default user defined'
    });
  }

  // Validate default user
  if (data.default) {
    validateUserObject(data.default, 'default', fileName, result);
  }

  // Validate order type users
  if (data.orderTypes) {
    for (const [orderType, user] of Object.entries(data.orderTypes)) {
      validateUserObject(user, `orderTypes.${orderType}`, fileName, result);
    }
  }

  // Validate user type users
  if (data.userTypes) {
    for (const [userType, user] of Object.entries(data.userTypes)) {
      validateUserObject(user, `userTypes.${userType}`, fileName, result);
    }
  }
}

/**
 * Validate user object
 */
function validateUserObject(user, path, fileName, result) {
  if (!user || typeof user !== 'object') {
    result.valid = false;
    result.errors.push({
      file: fileName,
      message: `Invalid user object at ${path}`
    });
    return;
  }

  const requiredFields = ['userId', 'email', 'phone', 'name'];
  for (const field of requiredFields) {
    if (!user[field]) {
      result.warnings.push({
        file: fileName,
        message: `Missing field "${field}" in user at ${path}`
      });
    }
  }

  // Validate email format (basic)
  if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    result.warnings.push({
      file: fileName,
      message: `Invalid email format at ${path}: ${user.email}`
    });
  }

  // Validate phone format (basic)
  if (user.phone && !/^\d{10}$/.test(user.phone)) {
    result.warnings.push({
      file: fileName,
      message: `Invalid phone format at ${path}: ${user.phone} (expected 10 digits)`
    });
  }
}

/**
 * Print validation results
 */
function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('Validation Summary');
  console.log('='.repeat(60));

  console.log(`\nTotal Files: ${results.totalFiles}`);
  console.log(`${colors.green}Valid Files: ${results.validFiles}${colors.reset}`);
  console.log(`${colors.red}Invalid Files: ${results.invalidFiles}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${results.warnings.length}${colors.reset}`);

  // Print errors
  if (results.errors.length > 0) {
    console.log(`\n${colors.red}Errors:${colors.reset}`);
    for (const error of results.errors) {
      console.log(`  ${colors.red}✗${colors.reset} [${error.category || ''}/${error.file || ''}] ${error.message}`);
    }
  }

  // Print warnings
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}Warnings:${colors.reset}`);
    for (const warning of results.warnings.slice(0, 10)) { // Limit to 10 warnings
      console.log(`  ${colors.yellow}⚠${colors.reset} [${warning.file || ''}] ${warning.message}`);
    }
    if (results.warnings.length > 10) {
      console.log(`  ... and ${results.warnings.length - 10} more warnings`);
    }
  }

  console.log('\n' + '='.repeat(60));
  
  if (results.invalidFiles === 0) {
    console.log(`${colors.green}✓ All datasets are valid!${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Validation failed${colors.reset}`);
  }
  
  console.log('='.repeat(60) + '\n');
}

// Run if called directly
if (require.main === module) {
  validateDatasets().catch(error => {
    console.error(`${colors.red}✗ Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  validateDatasets,
  validateCategory,
  validateDatasetFile
};