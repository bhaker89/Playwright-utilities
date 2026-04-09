/**
 * Flow Metadata Loader
 * 
 * Loads flow-level assertion metadata from .meta.yaml files.
 * Simple and lightweight.
 * 
 * EXAMPLE:
 * File: flows/order/place-order.meta.yaml
 * Contents:
 *   asserts:
 *     - order-success-banner-visible
 *     - cart-empty
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PLATFORM_MODE = process.env.PLATFORM_MODE === 'true';

/**
 * Load flow metadata from .meta.yaml file
 * @param {string} flowPath - Path to flow file (e.g., "flows/order/place-order.txt")
 * @returns {Object|null} - Flow metadata or null
 */
function loadFlowMetadata(flowPath) {
  if (!flowPath || typeof flowPath !== 'string') {
    return null;
  }

  // Construct metadata file path
  const metaPath = flowPath.replace(/\.(txt|yaml|yml)$/, '.meta.yaml');

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(metaPath, 'utf8');
    const metadata = yaml.load(content);

    if (PLATFORM_MODE) {
      const assertCount = metadata.asserts ? (Array.isArray(metadata.asserts) ? metadata.asserts.length : 1) : 0;
      console.log(`[ASSERTION] Loaded flow metadata: ${metaPath} (${assertCount} assertions)`);
    }

    return metadata;
  } catch (error) {
    console.error(`[ASSERTION] Failed to load flow metadata: ${metaPath}`, error.message);
    return null;
  }
}

/**
 * Check if flow has metadata file
 * @param {string} flowPath - Path to flow file
 * @returns {boolean} - True if metadata exists
 */
function hasFlowMetadata(flowPath) {
  if (!flowPath) {
    return false;
  }

  const metaPath = flowPath.replace(/\.(txt|yaml|yml)$/, '.meta.yaml');
  return fs.existsSync(metaPath);
}

module.exports = {
  loadFlowMetadata,
  hasFlowMetadata,
};