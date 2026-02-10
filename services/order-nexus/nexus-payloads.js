/**
 * Order Nexus Test Data - Payloads
 * Relocated to Services for logical separation
 */

function generateOrderPayload(overrides = {}) {
  const timestamp = Date.now();
  const orderId = `PO${timestamp}`;
  const groupOrderId = `PO${timestamp}`;
  const currentTimestamp = new Date().toISOString();

  const defaultPayload = {
    order_type: 'PHARMA',
    order_id: orderId,
    group_order_id: groupOrderId,
    user_id: '04bfd4e6-1e91-426e-88f4-e1730487842d',
    triggered_at: currentTimestamp,
    event: {
      event_name: 'ORDER_PLACED',
      sub_event_name: 'PAYMENT_CONFIRMED',
      event_type: 'ORDER_STATUS_UPDATE',
      description: 'Order has been placed successfully',
      triggered_at: currentTimestamp,
      received_at: currentTimestamp,
    },
    order_details: {
      basic_order_details: {
        order_id: orderId,
        group_order_id: groupOrderId,
        source: '1MG',
        platform: {
          name: 'ANDROID',
          version: '5.1.2',
        },
      },
      user_details: {
        user_id: '04bfd4e6-1e91-426e-88f4-e1730487842d',
        email: 'john.doe@example.com',
        contact_number: '+919876543210',
      },
      status: {
        id: 'ORDER_PLACED',
        title: 'Order Placed',
        sub_title: 'Your order has been placed successfully',
      },
      tags: ['URGENT', 'RX_REQUIRED'],
      extra_attributes: {
        are_rx_queued: false,
        screening_2_accepted: true,
      },
    },
  };

  return deepMerge(defaultPayload, overrides);
}

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

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

module.exports = {
  generateOrderPayload,
  OrderNexusPayloads: {
    validOrder: generateOrderPayload(),
    pharmaOrder: generateOrderPayload({ order_type: 'PHARMA' }),
    diagnosticOrder: generateOrderPayload({ order_type: 'DIAGNOSTIC' })
  }
};