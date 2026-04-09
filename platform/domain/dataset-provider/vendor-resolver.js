/**
 * Vendor Resolver
 * 
 * Resolves vendor/warehouse based on:
 * - Pincode
 * - City
 * - Order type
 * - Inventory availability
 * 
 * Resolution Priority:
 * 1. Pincode-specific vendor
 * 2. City-specific vendor
 * 3. Order type-specific vendor
 * 4. Default vendor
 * 
 * Usage:
 *   const vendor = await resolveVendor({
 *     type: 'rx',
 *     pincode: '400001',
 *     city: 'mumbai'
 *   });
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Resolve vendor for order
 * 
 * @param {Object} params - Resolution parameters
 * @param {string} params.type - Order type
 * @param {string} params.pincode - Delivery pincode
 * @param {string} params.city - City
 * @param {string} params.datasetPath - Custom dataset path
 * 
 * @returns {Promise<string>} Resolved vendor ID
 */
async function resolveVendor(params) {
  const {
    type,
    pincode,
    city = 'default',
    datasetPath
  } = params;

  console.log(`[VENDOR_RESOLVER] Resolving vendor for type="${type}", pincode="${pincode}", city="${city}"`);

  // Load vendor dataset
  const vendorDataset = await loadVendorDataset(city, datasetPath);

  // Priority 1: Pincode-specific vendor
  if (pincode && vendorDataset.pincodes && vendorDataset.pincodes[pincode]) {
    const vendor = vendorDataset.pincodes[pincode];
    console.log(`[VENDOR_RESOLVER] Using pincode-specific vendor: ${vendor}`);
    return vendor;
  }

  // Priority 2: Order type-specific vendor
  if (vendorDataset.types && vendorDataset.types[type]) {
    const vendor = vendorDataset.types[type];
    console.log(`[VENDOR_RESOLVER] Using type-specific vendor: ${vendor}`);
    return vendor;
  }

  // Priority 3: City default vendor
  if (vendorDataset.default) {
    console.log(`[VENDOR_RESOLVER] Using city default vendor: ${vendorDataset.default}`);
    return vendorDataset.default;
  }

  // Fallback: Generate vendor
  const fallbackVendor = `warehouse_${city}_${type}`;
  console.warn(`[VENDOR_RESOLVER] No vendor found, using fallback: ${fallbackVendor}`);
  return fallbackVendor;
}

/**
 * Load vendor dataset for city
 * 
 * @param {string} city - City name
 * @param {string} customPath - Custom dataset path
 * @returns {Promise<Object>} Vendor dataset
 */
async function loadVendorDataset(city, customPath) {
  const datasetFileName = `${city}.json`;
  
  // Try custom path first (child repo override)
  if (customPath) {
    const customFilePath = path.join(customPath, 'vendors', datasetFileName);
    try {
      const content = await fs.readFile(customFilePath, 'utf8');
      console.log(`[VENDOR_RESOLVER] Loaded vendor dataset from custom path: ${customFilePath}`);
      return JSON.parse(content);
    } catch (error) {
      console.log(`[VENDOR_RESOLVER] Custom dataset not found: ${customFilePath}`);
    }
  }

  // Try core dataset
  const coreDatasetPath = path.join(__dirname, '../../datasets/vendors', datasetFileName);
  try {
    const content = await fs.readFile(coreDatasetPath, 'utf8');
    console.log(`[VENDOR_RESOLVER] Loaded vendor dataset from core: ${coreDatasetPath}`);
    return JSON.parse(content);
  } catch (error) {
    console.log(`[VENDOR_RESOLVER] Core dataset not found: ${coreDatasetPath}, trying default`);
  }

  // Try default vendor dataset
  const defaultPath = path.join(__dirname, '../../datasets/vendors/default.json');
  try {
    const content = await fs.readFile(defaultPath, 'utf8');
    console.log(`[VENDOR_RESOLVER] Loaded default vendor dataset`);
    return JSON.parse(content);
  } catch (error) {
    console.warn(`[VENDOR_RESOLVER] Default dataset not found`);
    return {};
  }
}

/**
 * Check inventory availability at vendor
 * 
 * @param {string} vendor - Vendor ID
 * @param {string} sku - SKU
 * @param {string} pincode - Pincode
 * @returns {Promise<boolean>} Available or not
 */
async function checkInventoryAvailability(vendor, sku, pincode) {
  console.log(`[VENDOR_RESOLVER] Checking inventory: vendor="${vendor}", sku="${sku}", pincode="${pincode}"`);
  
  // TODO: Integrate with actual inventory service
  // For now, assume all inventory is available
  return true;
}

module.exports = {
  resolveVendor,
  loadVendorDataset,
  checkInventoryAvailability
};