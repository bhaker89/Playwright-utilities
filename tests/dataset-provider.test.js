/**
 * Phase-7 Dataset Provider Integration Tests
 * 
 * Tests the complete dataset provider integration with OrderFactory
 */

const { resolveDataset, validateResolvedDataset } = require('../platform/domain/dataset-provider');
const { createOrder } = require('../platform/domain/order-factory');

describe('Phase-7: Dataset Provider', () => {
  
  describe('Individual Resolvers', () => {
    
    test('SKU Resolver - should resolve city-specific SKU', async () => {
      const { resolveSku } = require('../platform/domain/dataset-provider/sku-resolver');
      
      const sku = await resolveSku({
        type: 'rx',
        city: 'mumbai',
        environment: 'test'
      });
      
      expect(sku).toBe('MED_RX_MUM_001');
    });
    
    test('SKU Resolver - should use environment-specific SKU', async () => {
      const { resolveSku } = require('../platform/domain/dataset-provider/sku-resolver');
      
      const sku = await resolveSku({
        type: 'rx',
        city: 'unknown',
        environment: 'staging'
      });
      
      expect(sku).toBe('MED_RX_STAGE_01');
    });
    
    test('Vendor Resolver - should resolve type-specific vendor', async () => {
      const { resolveVendor } = require('../platform/domain/dataset-provider/vendor-resolver');
      
      const vendor = await resolveVendor({
        type: 'rx',
        city: 'mumbai'
      });
      
      expect(vendor).toBe('warehouse_rx_main');
    });
    
    test('Address Resolver - should resolve city-specific address', async () => {
      const { resolveAddress } = require('../platform/domain/dataset-provider/address-resolver');
      
      const address = await resolveAddress({
        type: 'default',
        city: 'mumbai'
      });
      
      expect(address.city).toBe('Mumbai');
      expect(address.pincode).toBeTruthy();
    });
    
    test('Payment Resolver - should resolve order type-specific payment', async () => {
      const { resolvePayment } = require('../platform/domain/dataset-provider/payment-resolver');
      
      const payment = await resolvePayment({
        orderType: 'rx'
      });
      
      expect(payment.method).toBe('cod');
    });
    
    test('User Resolver - should resolve order type-specific user', async () => {
      const { resolveUser } = require('../platform/domain/dataset-provider/user-resolver');
      
      const user = await resolveUser({
        orderType: 'rx'
      });
      
      expect(user.userId).toBe('test_user_rx');
      expect(user.email).toBeTruthy();
    });
    
  });
  
  describe('Dataset Provider Integration', () => {
    
    test('should resolve complete dataset for RX order', async () => {
      const orderBlueprint = {
        type: 'rx',
        prescription: true
      };
      
      const context = {
        environment: 'test',
        city: 'mumbai'
      };
      
      const enriched = await resolveDataset(orderBlueprint, context);
      
      expect(enriched.dataset).toBeTruthy();
      expect(enriched.dataset.sku).toBe('MED_RX_MUM_001');
      expect(enriched.dataset.vendor).toBe('warehouse_rx_main');
      expect(enriched.dataset.address).toBeTruthy();
      expect(enriched.dataset.payment.method).toBe('cod');
      expect(enriched.dataset.user.userId).toBe('test_user_rx');
    });
    
    test('should resolve dataset for B2B order', async () => {
      const orderBlueprint = {
        type: 'b2b'
      };
      
      const context = {
        environment: 'staging',
        city: 'mumbai'
      };
      
      const enriched = await resolveDataset(orderBlueprint, context);
      
      expect(enriched.dataset.sku).toBeTruthy();
      expect(enriched.dataset.payment.method).toBe('invoice');
      expect(enriched.dataset.user.type).toBe('b2b');
    });
    
    test('should resolve dataset for corporate order', async () => {
      const orderBlueprint = {
        type: 'corporate'
      };
      
      const context = {
        environment: 'test'
      };
      
      const enriched = await resolveDataset(orderBlueprint, context);
      
      expect(enriched.dataset.payment.method).toBe('corporate-credit');
    });
    
    test('should apply team overrides', async () => {
      const orderBlueprint = {
        type: 'rx'
      };
      
      const context = {
        environment: 'test',
        teamOverrides: {
          sku: 'TEAM_CUSTOM_SKU'
        }
      };
      
      const enriched = await resolveDataset(orderBlueprint, context);
      
      expect(enriched.dataset.sku).toBe('TEAM_CUSTOM_SKU');
    });
    
    test('should validate resolved dataset', async () => {
      const orderBlueprint = {
        type: 'rx'
      };
      
      const enriched = await resolveDataset(orderBlueprint, {});
      const validation = validateResolvedDataset(enriched.dataset);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
    
    test('should handle resolution errors gracefully', async () => {
      const orderBlueprint = {
        type: 'invalid_type'
      };
      
      const enriched = await resolveDataset(orderBlueprint, {});
      
      // Should return enriched blueprint even on partial failure
      expect(enriched).toBeTruthy();
      expect(enriched.type).toBe('invalid_type');
    });
    
  });
  
  describe('OrderFactory Integration', () => {
    
    test('should enrich blueprint before strategy resolution', async () => {
      const orderBlueprint = {
        type: 'rx',
        prescription: true
      };
      
      const context = {
        environment: { name: 'test' },
        city: 'mumbai'
      };
      
      // Note: Will fail on strategy execution (no browser/API client)
      // But should successfully resolve dataset
      const result = await createOrder(orderBlueprint, context);
      
      // Check that dataset was attached to context
      expect(context.dataset).toBeTruthy();
      expect(context.dataset.sku).toBeTruthy();
      expect(context.dataset.vendor).toBeTruthy();
    });
    
    test('should include dataset in result blueprint', async () => {
      const orderBlueprint = {
        type: 'otc'
      };
      
      const context = {
        environment: { name: 'test' }
      };
      
      const result = await createOrder(orderBlueprint, context);
      
      expect(result.blueprint).toBeTruthy();
      expect(result.blueprint.dataset).toBeTruthy();
    });
    
  });
  
  describe('Performance', () => {
    
    test('should resolve dataset in under 50ms', async () => {
      const orderBlueprint = {
        type: 'rx'
      };
      
      const context = {
        environment: 'test',
        city: 'mumbai'
      };
      
      const start = Date.now();
      await resolveDataset(orderBlueprint, context);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(50);
    });
    
  });
  
  describe('Dataset Inheritance', () => {
    
    test('should support environment layer resolution', async () => {
      const { resolveEnvironmentLayer } = require('../platform/domain/dataset-provider/environment-layer-resolver');
      
      const config = await resolveEnvironmentLayer({
        environment: 'test'
      });
      
      expect(config.environment).toBe('test');
      expect(config.datasets).toBeTruthy();
    });
    
    test('should merge datasets correctly', async () => {
      const { mergeDatasets } = require('../platform/domain/dataset-provider/environment-layer-resolver');
      
      const layer1 = {
        skus: { rx: { default: 'SKU_1' } }
      };
      
      const layer2 = {
        skus: { rx: { staging: 'SKU_2' } }
      };
      
      const merged = mergeDatasets([layer1, layer2]);
      
      expect(merged.skus.rx.default).toBe('SKU_1');
      expect(merged.skus.rx.staging).toBe('SKU_2');
    });
    
  });
  
});