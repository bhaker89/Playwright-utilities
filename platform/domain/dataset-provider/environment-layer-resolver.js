/**
 * Environment Layer Resolver
 * 
 * Implements dataset inheritance hierarchy:
 * 1. Child repo dataset (highest priority)
 * 2. Service dataset
 * 3. Core dataset (lowest priority)
 * 
 * Supports environment-specific overrides within each layer.
 * 
 * Resolution Flow:
 * - Load core dataset
 * - Merge service dataset overrides
 * - Merge child repo dataset overrides
 * - Apply environment-specific values
 * 
 * Usage:
 *   const config = await resolveEnvironmentLayer({
 *     environment: 'staging',
 *     serviceDatasetPath: './service-datasets',
 *     childRepoDatasetPath: './datasets'
 *   });
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Resolve environment configuration with dataset inheritance
 * 
 * @param {Object} params - Resolution parameters
 * @param {string} params.environment - Environment name (test, staging, prod)
 * @param {string} params.serviceDatasetPath - Service-level dataset path
 * @param {string} params.childRepoDatasetPath - Child repo dataset path
 * @param {string} params.coreDatasetPath - Core dataset path (defaults to platform/datasets)
 * 
 * @returns {Promise<Object>} Merged environment configuration
 */
async function resolveEnvironmentLayer(params) {
  const {
    environment = 'test',
    serviceDatasetPath,
    childRepoDatasetPath,
    coreDatasetPath = path.join(__dirname, '../../datasets')
  } = params;

  console.log(`[ENV_LAYER_RESOLVER] Resolving environment layer for env="${environment}"`);
  console.log(`[ENV_LAYER_RESOLVER] Core: ${coreDatasetPath}`);
  console.log(`[ENV_LAYER_RESOLVER] Service: ${serviceDatasetPath || 'none'}`);
  console.log(`[ENV_LAYER_RESOLVER] Child repo: ${childRepoDatasetPath || 'none'}`);

  // Load datasets in order of precedence
  const coreDatasets = await loadDatasets(coreDatasetPath);
  const serviceDatasets = serviceDatasetPath ? await loadDatasets(serviceDatasetPath) : {};
  const childRepoDatasets = childRepoDatasetPath ? await loadDatasets(childRepoDatasetPath) : {};

  // Merge datasets (child > service > core)
  const mergedDatasets = mergeDatasets([
    coreDatasets,
    serviceDatasets,
    childRepoDatasets
  ]);

  console.log(`[ENV_LAYER_RESOLVER] ✓ Merged datasets from ${Object.keys(mergedDatasets).length} categories`);

  return {
    environment,
    datasets: mergedDatasets,
    paths: {
      core: coreDatasetPath,
      service: serviceDatasetPath,
      childRepo: childRepoDatasetPath
    }
  };
}

/**
 * Load all datasets from a directory
 * 
 * @param {string} datasetPath - Path to datasets directory
 * @returns {Promise<Object>} Loaded datasets by category
 */
async function loadDatasets(datasetPath) {
  const datasets = {};

  try {
    // Check if path exists
    await fs.access(datasetPath);
  } catch (error) {
    console.log(`[ENV_LAYER_RESOLVER] Dataset path not found: ${datasetPath}`);
    return datasets;
  }

  const categories = ['skus', 'vendors', 'addresses', 'payments', 'users'];

  for (const category of categories) {
    const categoryPath = path.join(datasetPath, category);
    
    try {
      await fs.access(categoryPath);
      datasets[category] = await loadCategoryDatasets(categoryPath);
      console.log(`[ENV_LAYER_RESOLVER] Loaded ${Object.keys(datasets[category]).length} datasets from ${category}`);
    } catch (error) {
      console.log(`[ENV_LAYER_RESOLVER] Category not found: ${category}`);
      datasets[category] = {};
    }
  }

  return datasets;
}

/**
 * Load all JSON files from a category directory
 * 
 * @param {string} categoryPath - Path to category directory
 * @returns {Promise<Object>} Loaded datasets
 */
async function loadCategoryDatasets(categoryPath) {
  const datasets = {};

  try {
    const files = await fs.readdir(categoryPath);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(categoryPath, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const datasetName = path.basename(file, '.json');
          datasets[datasetName] = JSON.parse(content);
        } catch (error) {
          console.warn(`[ENV_LAYER_RESOLVER] Failed to load ${file}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.warn(`[ENV_LAYER_RESOLVER] Failed to read category: ${error.message}`);
  }

  return datasets;
}

/**
 * Merge multiple dataset layers
 * 
 * Priority: later layers override earlier layers
 * 
 * @param {Array<Object>} layers - Array of dataset layers
 * @returns {Object} Merged datasets
 */
function mergeDatasets(layers) {
  const merged = {
    skus: {},
    vendors: {},
    addresses: {},
    payments: {},
    users: {}
  };

  for (const layer of layers) {
    for (const [category, datasets] of Object.entries(layer)) {
      if (!merged[category]) {
        merged[category] = {};
      }

      for (const [name, data] of Object.entries(datasets)) {
        // Deep merge individual datasets
        merged[category][name] = deepMerge(
          merged[category][name] || {},
          data
        );
      }
    }
  }

  return merged;
}

/**
 * Deep merge two objects
 * 
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

/**
 * Check if value is an object
 * 
 * @param {*} item - Value to check
 * @returns {boolean} Is object or not
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Get dataset path priority for resolution
 * 
 * @param {Object} params - Parameters
 * @returns {Array<string>} Array of paths in priority order
 */
function getDatasetPathPriority(params) {
  const {
    childRepoDatasetPath,
    serviceDatasetPath,
    coreDatasetPath = path.join(__dirname, '../../datasets')
  } = params;

  const paths = [];

  if (childRepoDatasetPath) {
    paths.push(childRepoDatasetPath);
  }

  if (serviceDatasetPath) {
    paths.push(serviceDatasetPath);
  }

  paths.push(coreDatasetPath);

  return paths;
}

module.exports = {
  resolveEnvironmentLayer,
  loadDatasets,
  loadCategoryDatasets,
  mergeDatasets,
  deepMerge,
  getDatasetPathPriority
};