/**
 * Address Resolver
 * 
 * Resolves delivery address based on:
 * - User type
 * - City
 * - Environment
 * - Address type (home, office, default)
 * 
 * Resolution Priority:
 * 1. Explicit address override
 * 2. User type-specific address
 * 3. City-specific address
 * 4. Default address
 * 
 * Usage:
 *   const address = await resolveAddress({
 *     type: 'default',
 *     city: 'mumbai',
 *     userType: 'test'
 *   });
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Resolve address for order
 * 
 * @param {Object} params - Resolution parameters
 * @param {string} params.type - Address type (default, home, office)
 * @param {string} params.city - City
 * @param {string} params.userType - User type (test, corporate, b2b)
 * @param {string} params.environment - Environment name
 * @param {Object} params.addressOverride - Explicit address object
 * @param {string} params.datasetPath - Custom dataset path
 * 
 * @returns {Promise<Object>} Resolved address
 */
async function resolveAddress(params) {
  const {
    type = 'default',
    city = 'default',
    userType,
    environment = 'test',
    addressOverride,
    datasetPath
  } = params;

  console.log(`[ADDRESS_RESOLVER] Resolving address for type="${type}", city="${city}", userType="${userType}"`);

  // Priority 1: Explicit override
  if (addressOverride) {
    console.log(`[ADDRESS_RESOLVER] Using address override`);
    return validateAndEnrichAddress(addressOverride);
  }

  // Load address dataset
  const addressDataset = await loadAddressDataset(type, datasetPath);

  // Priority 2: User type-specific address
  if (userType && addressDataset.userTypes && addressDataset.userTypes[userType]) {
    const address = addressDataset.userTypes[userType];
    console.log(`[ADDRESS_RESOLVER] Using user type-specific address`);
    return validateAndEnrichAddress(address);
  }

  // Priority 3: City-specific address
  if (addressDataset.cities && addressDataset.cities[city]) {
    const address = addressDataset.cities[city];
    console.log(`[ADDRESS_RESOLVER] Using city-specific address`);
    return validateAndEnrichAddress(address);
  }

  // Priority 4: Environment-specific address
  if (addressDataset.environments && addressDataset.environments[environment]) {
    const address = addressDataset.environments[environment];
    console.log(`[ADDRESS_RESOLVER] Using environment-specific address`);
    return validateAndEnrichAddress(address);
  }

  // Priority 5: Default address
  if (addressDataset.default) {
    console.log(`[ADDRESS_RESOLVER] Using default address`);
    return validateAndEnrichAddress(addressDataset.default);
  }

  // Fallback: Generate minimal address
  const fallbackAddress = {
    line1: '123 Test Street',
    line2: 'Test Area',
    city: city || 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India',
    type: type
  };
  console.warn(`[ADDRESS_RESOLVER] No address found, using fallback`);
  return fallbackAddress;
}

/**
 * Load address dataset
 * 
 * @param {string} type - Address type
 * @param {string} customPath - Custom dataset path
 * @returns {Promise<Object>} Address dataset
 */
async function loadAddressDataset(type, customPath) {
  const datasetFileName = `${type}.json`;
  
  // Try custom path first (child repo override)
  if (customPath) {
    const customFilePath = path.join(customPath, 'addresses', datasetFileName);
    try {
      const content = await fs.readFile(customFilePath, 'utf8');
      console.log(`[ADDRESS_RESOLVER] Loaded address dataset from custom path: ${customFilePath}`);
      return JSON.parse(content);
    } catch (error) {
      console.log(`[ADDRESS_RESOLVER] Custom dataset not found: ${customFilePath}`);
    }
  }

  // Try core dataset
  const coreDatasetPath = path.join(__dirname, '../../datasets/addresses', datasetFileName);
  try {
    const content = await fs.readFile(coreDatasetPath, 'utf8');
    console.log(`[ADDRESS_RESOLVER] Loaded address dataset from core: ${coreDatasetPath}`);
    return JSON.parse(content);
  } catch (error) {
    console.log(`[ADDRESS_RESOLVER] Core dataset not found: ${coreDatasetPath}, trying default`);
  }

  // Try default address dataset
  const defaultPath = path.join(__dirname, '../../datasets/addresses/default.json');
  try {
    const content = await fs.readFile(defaultPath, 'utf8');
    console.log(`[ADDRESS_RESOLVER] Loaded default address dataset`);
    return JSON.parse(content);
  } catch (error) {
    console.warn(`[ADDRESS_RESOLVER] Default dataset not found`);
    return {};
  }
}

/**
 * Validate and enrich address object
 * 
 * @param {Object} address - Address to validate
 * @returns {Object} Validated and enriched address
 */
function validateAndEnrichAddress(address) {
  if (!address || typeof address !== 'object') {
    throw new Error('Invalid address object');
  }

  // Ensure required fields
  const requiredFields = ['line1', 'city', 'pincode'];
  for (const field of requiredFields) {
    if (!address[field]) {
      console.warn(`[ADDRESS_RESOLVER] Missing required field: ${field}`);
    }
  }

  // Enrich with defaults
  return {
    line1: address.line1 || '',
    line2: address.line2 || '',
    city: address.city || 'Mumbai',
    state: address.state || 'Maharashtra',
    pincode: address.pincode || '400001',
    country: address.country || 'India',
    landmark: address.landmark || '',
    type: address.type || 'home',
    ...address // Preserve any additional fields
  };
}

/**
 * Validate pincode for serviceability
 * 
 * @param {string} pincode - Pincode to validate
 * @returns {Promise<boolean>} Serviceable or not
 */
async function validatePincode(pincode) {
  console.log(`[ADDRESS_RESOLVER] Validating pincode: ${pincode}`);
  
  // TODO: Integrate with actual serviceability service
  // For now, assume all pincodes are serviceable
  return true;
}

module.exports = {
  resolveAddress,
  loadAddressDataset,
  validateAndEnrichAddress,
  validatePincode
};