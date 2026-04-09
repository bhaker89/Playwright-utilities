/**
 * Dataset Provider Engine
 * 
 * Main entry point for dataset resolution.
 * 
 * Responsibilities:
 * - Resolve SKU, vendor, address, payment, user before OrderFactory execution
 * - Support dataset inheritance (core → service → child repo)
 * - Support environment-specific overrides
 * - Support team overrides
 * - Enrich order blueprint with resolved datasets
 * 
 * Pipeline Integration:
 * TXT DSL → normalization → dataset-provider.resolve() → blueprint enrichment 
 * → strategy resolver → OrderFactory execution → context.orderId attached
 * 
 * Usage:
 *   const { resolveDataset } = require('./platform/domain/dataset-provider');
 *   
 *   const enrichedBlueprint = await resolveDataset(orderBlueprint, {
 *     environment: 'staging',
 *     datasetPath: './datasets'
 *   });
 */

const { resolveSku } = require('./sku-resolver');
const { resolveVendor } = require('./vendor-resolver');
const { resolveAddress } = require('./address-resolver');
const { resolvePayment } = require('./payment-resolver');
const { resolveUser } = require('./user-resolver');
const { resolveEnvironmentLayer, getDatasetPathPriority } = require('./environment-layer-resolver');

/**
 * Resolve dataset for order blueprint
 * 
 * This is the main entry point that orchestrates all resolvers.
 * 
 * @param {Object} orderBlueprint - Order blueprint from DSL parser
 * @param {Object} context - Execution context
 * @param {string} context.environment - Environment name
 * @param {string} context.datasetPath - Custom dataset path (child repo)
 * @param {string} context.serviceDatasetPath - Service-level dataset path
 * @param {Object} context.teamOverrides - Team-specific overrides
 * 
 * @returns {Promise<Object>} Enriched blueprint with dataset
 */
async function resolveDataset(orderBlueprint, context = {}) {
  console.log('\n' + '='.repeat(60));
  console.log('[DATASET_PROVIDER] Resolving datasets for order...');
  console.log('[DATASET_PROVIDER] Order Type:', orderBlueprint.type);
  console.log('[DATASET_PROVIDER] Environment:', context.environment || 'test');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    // Extract parameters from blueprint and context
    const {
      type: orderType,
      attributes = {},
      source,
      prescription,
      split,
      discount
    } = orderBlueprint;

    const {
      environment = 'test',
      datasetPath,
      serviceDatasetPath,
      teamOverrides = {},
      city = 'mumbai',
      pincode
    } = context;

    // Determine if corporate order
    const isCorporate = orderType === 'corporate' || orderType === 'b2b';

    // Get dataset path priority
    const datasetPaths = getDatasetPathPriority({
      childRepoDatasetPath: datasetPath,
      serviceDatasetPath
    });

    console.log('[DATASET_PROVIDER] Dataset resolution order:');
    datasetPaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

    // Resolve each dataset component in parallel for performance
    const [sku, vendor, address, payment, user] = await Promise.all([
      // Resolve SKU
      resolveSku({
        type: orderType,
        city,
        environment,
        teamOverride: teamOverrides.sku,
        datasetPath: datasetPaths[0]
      }),

      // Resolve Vendor
      resolveVendor({
        type: orderType,
        pincode,
        city,
        datasetPath: datasetPaths[0]
      }),

      // Resolve Address
      resolveAddress({
        type: attributes.addressType || 'default',
        city,
        userType: isCorporate ? 'corporate' : 'test',
        environment,
        addressOverride: teamOverrides.address,
        datasetPath: datasetPaths[0]
      }),

      // Resolve Payment
      resolvePayment({
        type: attributes.paymentType,
        orderType,
        userType: isCorporate ? 'corporate' : 'test',
        isCorporate,
        environment,
        paymentOverride: teamOverrides.payment,
        datasetPath: datasetPaths[0]
      }),

      // Resolve User
      resolveUser({
        orderType,
        userType: attributes.userType,
        isCorporate,
        environment,
        userOverride: teamOverrides.user,
        datasetPath: datasetPaths[0]
      })
    ]);

    // Build resolved dataset
    const resolvedDataset = {
      sku,
      vendor,
      address,
      payment,
      user,
      environment,
      city,
      pincode,
      resolvedAt: new Date().toISOString(),
      resolutionDuration: Date.now() - startTime
    };

    // Log resolution summary
    logDatasetResolution(resolvedDataset, orderBlueprint);

    // Return enriched blueprint
    const enrichedBlueprint = {
      ...orderBlueprint,
      dataset: resolvedDataset
    };

    console.log('='.repeat(60));
    console.log('[DATASET_PROVIDER] ✓ Dataset resolution complete');
    console.log(`[DATASET_PROVIDER] Duration: ${resolvedDataset.resolutionDuration}ms`);
    console.log('='.repeat(60) + '\n');

    return enrichedBlueprint;

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('='.repeat(60));
    console.error('[DATASET_PROVIDER] ✗ Dataset resolution failed');
    console.error('[DATASET_PROVIDER] Error:', error.message);
    console.error('[DATASET_PROVIDER] Duration:', duration + 'ms');
    console.error('='.repeat(60) + '\n');

    // Return original blueprint with error marker
    return {
      ...orderBlueprint,
      dataset: {
        error: error.message,
        resolvedAt: new Date().toISOString(),
        resolutionDuration: duration
      }
    };
  }
}

/**
 * Log dataset resolution summary with telemetry
 * 
 * @param {Object} dataset - Resolved dataset
 * @param {Object} blueprint - Order blueprint
 */
function logDatasetResolution(dataset, blueprint) {
  console.log('\n[DATASET_PROVIDER] Resolution Summary:');
  console.log('  Order Type:', blueprint.type);
  console.log('  SKU:', dataset.sku);
  console.log('  Vendor:', dataset.vendor);
  console.log('  Address City:', dataset.address.city);
  console.log('  Address Pincode:', dataset.address.pincode);
  console.log('  Payment Method:', dataset.payment.method);
  console.log('  User ID:', dataset.user.userId);
  console.log('  Environment:', dataset.environment);
}

/**
 * Validate resolved dataset
 * 
 * Ensures all required fields are present
 * 
 * @param {Object} dataset - Resolved dataset
 * @returns {Object} Validation result
 */
function validateResolvedDataset(dataset) {
  const errors = [];

  if (!dataset.sku) {
    errors.push('SKU is required');
  }

  if (!dataset.vendor) {
    errors.push('Vendor is required');
  }

  if (!dataset.address || !dataset.address.pincode) {
    errors.push('Address with pincode is required');
  }

  if (!dataset.payment || !dataset.payment.method) {
    errors.push('Payment method is required');
  }

  if (!dataset.user || !dataset.user.userId) {
    errors.push('User is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get dataset resolution metadata
 * 
 * Useful for debugging and telemetry
 * 
 * @param {Object} enrichedBlueprint - Blueprint with dataset
 * @returns {Object} Metadata
 */
function getDatasetMetadata(enrichedBlueprint) {
  const { dataset } = enrichedBlueprint;

  if (!dataset) {
    return {
      resolved: false
    };
  }

  return {
    resolved: true,
    hasError: !!dataset.error,
    duration: dataset.resolutionDuration,
    resolvedAt: dataset.resolvedAt,
    components: {
      sku: !!dataset.sku,
      vendor: !!dataset.vendor,
      address: !!dataset.address,
      payment: !!dataset.payment,
      user: !!dataset.user
    }
  };
}

module.exports = {
  resolveDataset,
  validateResolvedDataset,
  getDatasetMetadata,
  logDatasetResolution
};