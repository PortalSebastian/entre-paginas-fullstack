const ORDER_TRANSITIONS = Object.freeze({
  PENDING: new Set(['CONFIRMED', 'CANCELLED']),
  CONFIRMED: new Set(['PREPARING', 'CANCELLED']),
  PREPARING: new Set(['SHIPPED', 'CANCELLED']),
  SHIPPED: new Set(['DELIVERED']),
  DELIVERED: new Set(),
  CANCELLED: new Set(),
});

function moneyToCents(value) {
  const cents = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    const error = new Error('Invalid money value.');
    error.code = 'INVALID_MONEY_VALUE';
    error.status = 422;
    throw error;
  }
  return cents;
}

function centsToMoney(value) {
  return (value / 100).toFixed(2);
}

export function calculateOrderTotals(items, shippingPrice) {
  let subtotalCents = 0;

  const calculatedItems = items.map((item) => {
    const lineTotalCents = moneyToCents(item.unitPrice) * item.quantity;
    subtotalCents += lineTotalCents;
    return {
      productId: item.productId,
      title: item.title,
      unitPrice: centsToMoney(moneyToCents(item.unitPrice)),
      quantity: item.quantity,
      lineTotal: centsToMoney(lineTotalCents),
    };
  });

  const shippingCents = moneyToCents(shippingPrice);
  return {
    items: calculatedItems,
    subtotal: centsToMoney(subtotalCents),
    shippingCost: centsToMoney(shippingCents),
    total: centsToMoney(subtotalCents + shippingCents),
  };
}

export function assertOrderTransition(currentStatus, nextStatus) {
  if (!ORDER_TRANSITIONS[currentStatus]?.has(nextStatus)) {
    const error = new Error(`Cannot change order from ${currentStatus} to ${nextStatus}.`);
    error.code = 'INVALID_ORDER_TRANSITION';
    error.status = 409;
    throw error;
  }
}

export { ORDER_TRANSITIONS };
