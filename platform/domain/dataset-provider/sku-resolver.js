/**
 * SKU Resolver
 * 
 * Resolves SKU (Stock Keeping Unit) based on:
 * - Order type (rx, otc, mixed, b2b, corporate)
 * - City/Location
 * - Environment (staging, prod, test)
 * - Team override
 * 
 * Resolution Priority:
 * 1. Team override (if provided)
 * 2. Environment-specific SKU
 * 3. City-specific SKU
 * 4. Default SKU for order type
 * 
 * Usage:
 *   const sku = await resolveSku({
 *     type: 'rx',
 *     city: 'mumbai',
 *     environment: 'staging',
 *     teamOverride: 'MED_RX_TEAM_01'
 *   });
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Resolve SKU for order
 * 
 * @param {Object} params - Resolution parameters
 * @param {string} params.type - Order type (rx, otc, mixed, b2b, corporate)
 * @param {string} params.city - City/location
 * @param {string} params.environment - Environment name
 * @param {string} params.teamOverride - Team-specific override SKU
 * @param {string} params.datasetPath - Custom dataset path (for child repo overrides)
 * 
 * @returns {Promise<string>} Resolved SKU
 */
async function resolveSku(params) {
  const {
    type,
    city = 'default',
    environment = 'test',
    teamOverride,
    datasetPath
  } = params;

  console.log(`[SKU_RESOLVER] Resolving SKU for type="${type}", city="${city}", env="${environment}"`);

  // Priority 1: Team override
  if (teamOverride) {
    console.log(`[SKU_RESOLVER] Using team override: ${teamOverride}`);
    return teamOverride;
  }

  // Load SKU dataset
  const skuDataset = await loadSkuDataset(type, datasetPath);

  // Priority 2: Environment-specific SKU
  if (skuDataset[environment]) {
    console.log(`[SKU_RESOLVER] Using environment-specific SKU: ${skuDataset[environment]}`);
    return skuDataset[environment];
  }

  // Priority 3: City-specific SKU
  if (skuDataset[city]) {
    console.log(`[SKU_RESOLVER] Using city-specific SKU: ${skuDataset[city]}`);
    return skuDataset[city];
  }

  // Priority 4: Default SKU
  if (skuDataset.default) {
    console.log(`[SKU_RESOLVER] Using default SKU: ${skuDataset.default}`);
    return skuDataset.default;
  }

  // Fallback: Generate SKU
  const fallbackSku = `SKU_${type.toUpperCase()}_${Date.now()}`;
  console.warn(`[SKU_RESOLVER] No SKU found, using fallback: ${fallbackSku}`);
  return fallbackSku;
}

/**
 * Load SKU dataset for order type
 * 
 * Supports dataset inheritance:
 * 1. Custom dataset path (child repo)
 * 2. Service dataset
 * 3. Core dataset
 * 
 * @param {string} type - Order type
 * @param {string} customPath - Custom dataset path
 * @returns {Promise<Object>} SKU dataset
 */
async function loadSkuDataset(type, customPath) {
  const datasetFileName = `${type}.json`;
  
  // Try custom path first (child repo override)
  if (customPath) {
    const customFilePath = path.join(customPath, 'skus', datasetFileName);
    try {
      const content = await fs.readFile(customFilePath, 'utf8');
      console.log(`[SKU_RESOLVER] Loaded SKU dataset from custom path: ${customFilePath}`);
      return JSON.parse(content);
    } catch (error) {
      console.log(`[SKU_RESOLVER] Custom dataset not found: ${customFilePath}`);
    }
  }

  // Try core dataset
  const coreDatasetPath = path.join(__dirname, '../../datasets/skus', datasetFileName);
  try {
    const content = await fs.readFile(coreDatasetPath, 'utf8');
    console.log(`[SKU_RESOLVER] Loaded SKU dataset from core: ${coreDatasetPath}`);
    return JSON.parse(content);
  } catch (error) {
    console.warn(`[SKU_RESOLVER] Core dataset not found: ${coreDatasetPath}`);
    return {};
  }
}

/**
 * Validate SKU format
 * 
 * @param {string} sku - SKU to validate
 * @returns {boolean} Valid or not
 */
function validateSku(sku) {
  if (!sku || typeof sku !== 'string') {
    return false;
  }

  // Basic validation: non-empty string
  return sku.trim().length > 0;
}

module.exports = {
  resolveSku,
  loadSkuDataset,
  validateSku
};