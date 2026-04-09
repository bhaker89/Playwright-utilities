/**
 * Order Factory Tests
 * 
 * Tests for Phase-3 order creation capabilities
 */

const { createOrder } = require('../../platform/domain/order-factory');
const { parseOrderBlueprint, validateBlueprint } = require('../../platform/core/dsl-normalizer/order-blueprint-parser');
const { resolveStrategy } = require('../../platform/domain/order-factory/strategy-resolver');
const { FlowCompositionEngine } = require('../../platform/core/flow-composition-engine');

describe('Phase-3: Order Factory', () => {
  
  describe('Order Blueprint Parser', () => {
    test('parses simple RX order command', () => {
      const blueprint = parseOrderBlueprint('create order type=rx');
      
      expect(blueprint.type).toBe('rx');
      expect(blueprint.prescription).toBe(true); // Default for RX
      expect(blueprint.split).toBe(false);
    });

    test('parses RX order without prescription', () => {
      const blueprint = parseOrderBlueprint('create order type=rx prescription=false');
      
      expect(blueprint.type).toBe('rx');
      expect(blueprint.prescription).toBe(false);
    });

    test('parses complex mixed order with modifiers', () => {
      const blueprint = parseOrderBlueprint(
        'create order type=mixed split=true discount=coupon source=paytm'
      );
      
      expect(blueprint.type).toBe('mixed');
      expect(blueprint.split).toBe(true);
      expect(blueprint.discount).toBe('coupon');
      expect(blueprint.source).toBe('paytm');
    });

    test('validates blueprint correctly', () => {
      const blueprint = { type: 'rx', prescription: false };
      const validation = validateBlueprint(blueprint);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('rejects invalid order type', () => {
      const blueprint = { type: 'invalid' };
      const validation = validateBlueprint(blueprint);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Strategy Resolver', () => {
    test('resolves B2B orders to API strategy', () => {
      const strategy = resolveStrategy({ type: 'b2b' });
      expect(strategy).toBe('api');
    });

    test('resolves corporate orders to API strategy', () => {
      const strategy = resolveStrategy({ type: 'corporate' });
      expect(strategy).toBe('api');
    });

    test('resolves RX without prescription to API strategy', () => {
      const strategy = resolveStrategy({ 
        type: 'rx', 
        prescription: false 
      });
      expect(strategy).toBe('api');
    });

    test('resolves mixed orders to hybrid strategy', () => {
      const strategy = resolveStrategy({ type: 'mixed' });
      expect(strategy).toBe('hybrid');
    });

    test('resolves split orders to hybrid strategy', () => {
      const strategy = resolveStrategy({ 
        type: 'otc', 
        split: true 
      });
      expect(strategy).toBe('hybrid');
    });

    test('resolves discount orders to hybrid strategy', () => {
      const strategy = resolveStrategy({ 
        type: 'otc', 
        discount: 'coupon' 
      });
      expect(strategy).toBe('hybrid');
    });

    test('resolves external source orders to API strategy', () => {
      const strategy = resolveStrategy({ 
        type: 'otc', 
        source: 'paytm' 
      });
      expect(strategy).toBe('api');
    });

    test('respects force API option', () => {
      const strategy = resolveStrategy(
        { type: 'otc' }, 
        { forceApi: true }
      );
      expect(strategy).toBe('api');
    });

    test('respects force UI option', () => {
      const strategy = resolveStrategy(
        { type: 'b2b' }, 
        { forceUi: true }
      );
      expect(strategy).toBe('ui');
    });
  });

  describe('Order Creation (Integration)', () => {
    test('creates order with API strategy', async () => {
      const blueprint = { 
        type: 'b2b',
        source: 'web'
      };

      const context = {
        apiClient: null, // Will simulate
        environment: { name: 'test' }
      };

      const result = await createOrder(blueprint, context);

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.strategy).toBe('api');
      expect(result.orderId).toMatch(/ORDER_\d+/);
    });

    test('creates order with UI strategy (simulated)', async () => {
      const blueprint = { 
        type: 'otc'
      };

      const context = {
        flowComposer: new FlowCompositionEngine(),
        environment: { name: 'test' }
      };

      const result = await createOrder(blueprint, context);

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.strategy).toBe('ui');
    });

    test('validates blueprint before creation', async () => {
      const blueprint = { 
        type: 'invalid_type'
      };

      const context = {
        environment: { name: 'test' }
      };

      const result = await createOrder(blueprint, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Flow Composition Engine', () => {
    test('composes RX order flow', async () => {
      const composer = new FlowCompositionEngine();
      const blueprint = { type: 'rx' };

      const steps = await composer.composeOrderFlow(blueprint);

      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
    });

    test('composes split order flow', async () => {
      const composer = new FlowCompositionEngine();
      const blueprint = { 
        type: 'otc', 
        split: true 
      };

      const steps = await composer.composeOrderFlow(blueprint);

      expect(Array.isArray(steps)).toBe(true);
      // Should include base flow + split modifier flow
      expect(steps.length).toBeGreaterThan(0);
    });

    test('composes discount order flow', async () => {
      const composer = new FlowCompositionEngine();
      const blueprint = { 
        type: 'otc', 
        discount: 'coupon' 
      };

      const steps = await composer.composeOrderFlow(blueprint);

      expect(Array.isArray(steps)).toBe(true);
    });
  });

  describe('End-to-End Order Creation', () => {
    test('complete order creation workflow', async () => {
      // Parse DSL command
      const dslCommand = 'create order type=rx prescription=false split=true';
      const blueprint = parseOrderBlueprint(dslCommand);

      // Validate
      const validation = validateBlueprint(blueprint);
      expect(validation.valid).toBe(true);

      // Resolve strategy
      const strategy = resolveStrategy(blueprint);
      expect(['api', 'ui', 'hybrid']).toContain(strategy);

      // Create order
      const context = {
        flowComposer: new FlowCompositionEngine(),
        environment: { name: 'test' }
      };

      const result = await createOrder(blueprint, context);

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.duration).toBeDefined();
    });
  });
});