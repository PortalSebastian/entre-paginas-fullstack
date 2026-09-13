import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertOrderTransition,
  calculateOrderTotals,
} from '../../services/order-rules.js';

test('calculateOrderTotals uses server prices and exact cent arithmetic', () => {
  const result = calculateOrderTotals(
    [
      { productId: 1, title: 'Book A', unitPrice: '39.90', quantity: 2 },
      { productId: 2, title: 'Book B', unitPrice: '20.00', quantity: 1 },
    ],
    '10.00',
  );

  assert.deepEqual(result, {
    items: [
      {
        productId: 1,
        title: 'Book A',
        unitPrice: '39.90',
        quantity: 2,
        lineTotal: '79.80',
      },
      {
        productId: 2,
        title: 'Book B',
        unitPrice: '20.00',
        quantity: 1,
        lineTotal: '20.00',
      },
    ],
    subtotal: '99.80',
    shippingCost: '10.00',
    total: '109.80',
  });
});

test('assertOrderTransition rejects cancelling a shipped order', () => {
  assert.throws(
    () => assertOrderTransition('SHIPPED', 'CANCELLED'),
    (error) => error.code === 'INVALID_ORDER_TRANSITION' && error.status === 409,
  );
});

test('assertOrderTransition accepts the configured forward lifecycle', () => {
  assert.doesNotThrow(() => assertOrderTransition('PENDING', 'CONFIRMED'));
  assert.doesNotThrow(() => assertOrderTransition('CONFIRMED', 'PREPARING'));
  assert.doesNotThrow(() => assertOrderTransition('PREPARING', 'SHIPPED'));
  assert.doesNotThrow(() => assertOrderTransition('SHIPPED', 'DELIVERED'));
});
