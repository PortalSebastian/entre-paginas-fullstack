import test from 'node:test';
import assert from 'node:assert/strict';

import { createOrderService } from '../../services/order-service.js';

function buildDependencies({ stock = 5, orderStatus = 'PENDING', stockRestoredAt = null } = {}) {
  const product = {
    id: 1,
    title: 'Clean Code',
    price: '39.90',
    stock,
    isActive: true,
    async save() {},
  };
  const order = {
    id: 91,
    orderNumber: 'EP-20260902-ABCDEF12',
    status: orderStatus,
    stockRestoredAt,
    async update(values) {
      Object.assign(this, values);
    },
  };
  const created = { order: null, items: [], history: [] };

  return {
    product,
    order,
    created,
    dependencies: {
      sequelize: {
        async transaction(callback) {
          return callback({ LOCK: { UPDATE: 'UPDATE' } });
        },
      },
      Product: {
        async findAll() { return [product]; },
      },
      ShippingMethod: {
        async findOne() {
          return { id: 2, code: 'standard', name: 'Envío estándar', price: '10.00', isActive: true };
        },
      },
      Order: {
        async create(values) {
          created.order = values;
          Object.assign(order, values);
          return order;
        },
        async findByPk() { return order; },
        async findAll() { return [order]; },
      },
      OrderItem: {
        async bulkCreate(values) {
          created.items.push(...values);
          return values;
        },
        async findAll() {
          return [{ orderId: 91, productId: 1, quantity: 2 }];
        },
      },
      OrderStatusHistory: {
        async create(values) {
          created.history.push(values);
          return values;
        },
      },
      generateOrderNumber: () => 'EP-20260902-ABCDEF12',
      now: () => new Date('2026-09-02T15:00:00.000Z'),
    },
  };
}

function orderPayload() {
  return {
    buyer: {
      name: 'Ana Pérez',
      document: '12345678',
      email: 'ana@example.org',
      phone: '987654321',
    },
    shipping: {
      address: 'Calle 1',
      district: 'Centro',
      city: 'lima',
      reference: null,
      requestedDate: '2026-09-05',
      methodCode: 'standard',
    },
    payment: { brand: 'visa', lastFour: '4242' },
    items: [{ productId: 1, quantity: 2 }],
  };
}

test('createOrder recalculates totals and decreases stock in one transaction', async () => {
  const fixture = buildDependencies();
  const service = createOrderService(fixture.dependencies);

  const result = await service.createOrder(orderPayload(), { id: 7 });

  assert.equal(fixture.product.stock, 3);
  assert.equal(fixture.created.order.userId, 7);
  assert.equal(fixture.created.order.subtotal, '79.80');
  assert.equal(fixture.created.order.shippingCost, '10.00');
  assert.equal(fixture.created.order.total, '89.80');
  assert.equal(fixture.created.items[0].unitPrice, '39.90');
  assert.equal(fixture.created.history[0].toStatus, 'PENDING');
  assert.equal(result.orderNumber, 'EP-20260902-ABCDEF12');
});

test('createOrder rejects insufficient stock before creating an order', async () => {
  const fixture = buildDependencies({ stock: 1 });
  const service = createOrderService(fixture.dependencies);

  await assert.rejects(
    () => service.createOrder(orderPayload(), null),
    (error) => error.code === 'INSUFFICIENT_STOCK' && error.status === 409,
  );
  assert.equal(fixture.created.order, null);
  assert.equal(fixture.product.stock, 1);
});

test('cancelOrder restores stock only on the first cancellation', async () => {
  const fixture = buildDependencies({ stock: 3, orderStatus: 'CONFIRMED' });
  const service = createOrderService(fixture.dependencies);

  await service.updateStatus(91, 'CANCELLED', { id: 2 });

  assert.equal(fixture.product.stock, 5);
  assert.equal(fixture.order.status, 'CANCELLED');
  assert.equal(fixture.order.stockRestoredAt.toISOString(), '2026-09-02T15:00:00.000Z');
  assert.equal(fixture.created.history.at(-1).changedByUserId, 2);

  await assert.rejects(
    () => service.updateStatus(91, 'CANCELLED', { id: 2 }),
    (error) => error.code === 'INVALID_ORDER_TRANSITION',
  );
  assert.equal(fixture.product.stock, 5);
});

test('listOrders applies an optional status filter', async () => {
  const fixture = buildDependencies();
  let receivedQuery;
  fixture.dependencies.Order.findAll = async (query) => {
    receivedQuery = query;
    return [fixture.order];
  };
  const service = createOrderService(fixture.dependencies);

  const orders = await service.listOrders({ status: 'PENDING' });

  assert.equal(receivedQuery.where.status, 'PENDING');
  assert.equal(orders[0].id, 91);
});

test('getOrder reports a missing administrative order', async () => {
  const fixture = buildDependencies();
  fixture.dependencies.Order.findByPk = async () => null;
  const service = createOrderService(fixture.dependencies);

  await assert.rejects(
    () => service.getOrder(999),
    (error) => error.code === 'ORDER_NOT_FOUND' && error.status === 404,
  );
});

// --- Control de acceso por pertenencia del recurso --------------------------
// Estas pruebas cubren el caso que la rubrica llama "acceso a recurso ajeno":
// dos clientes autenticados legitimamente, cada uno con derecho unicamente
// sobre sus propios pedidos.

const OWNER = { id: 10, role: 'CUSTOMER' };
const INTRUDER = { id: 11, role: 'CUSTOMER' };

function ownershipDependencies(storedOrders) {
  return {
    sequelize: { async transaction(callback) { return callback({}); } },
    Product: {},
    ShippingMethod: {},
    Order: {
      async findAll({ where }) {
        return storedOrders.filter((order) => Number(order.userId) === Number(where.userId));
      },
      async findByPk(id) {
        return storedOrders.find((order) => Number(order.id) === Number(id)) ?? null;
      },
    },
    OrderItem: {},
    OrderStatusHistory: {},
  };
}

const storedOrders = [
  {
    id: 501,
    userId: 10,
    orderNumber: 'EP-20260903-OWNER001',
    status: 'PENDING',
    total: '120.00',
    subtotal: '100.00',
    shippingCost: '20.00',
    shippingMethodName: 'Envio estandar',
    requestedDeliveryDate: '2026-09-10',
    createdAt: '2026-09-03T10:00:00.000Z',
    items: [{ productId: 1, productTitle: 'Clean Code', unitPrice: '50.00', quantity: 2, lineTotal: '100.00' }],
  },
  {
    id: 502,
    userId: 11,
    orderNumber: 'EP-20260903-OTHER002',
    status: 'CONFIRMED',
    total: '80.00',
    subtotal: '60.00',
    shippingCost: '20.00',
    shippingMethodName: 'Envio expreso',
    requestedDeliveryDate: '2026-09-11',
    createdAt: '2026-09-03T11:00:00.000Z',
    items: [],
  },
  {
    id: 503,
    userId: null,
    orderNumber: 'EP-20260903-GUEST003',
    status: 'PENDING',
    total: '45.00',
    subtotal: '25.00',
    shippingCost: '20.00',
    shippingMethodName: 'Recojo en tienda',
    requestedDeliveryDate: '2026-09-12',
    createdAt: '2026-09-03T12:00:00.000Z',
    items: [],
  },
];

test('a customer only lists the orders that belong to them', async () => {
  const service = createOrderService(ownershipDependencies(storedOrders));

  const own = await service.listOwnOrders(OWNER);

  assert.equal(own.length, 1);
  assert.equal(own[0].id, 501);
  assert.equal(own[0].total, 120);
  assert.equal(own[0].items[0].quantity, 2);
});

test('a customer reads their own order', async () => {
  const service = createOrderService(ownershipDependencies(storedOrders));

  const order = await service.getOwnOrder(501, OWNER);

  assert.equal(order.orderNumber, 'EP-20260903-OWNER001');
});

test("reading another customer's order fails exactly like a missing one", async () => {
  const service = createOrderService(ownershipDependencies(storedOrders));

  const foreign = await service.getOwnOrder(502, OWNER).catch((error) => error);
  const missing = await service.getOwnOrder(999_999, OWNER).catch((error) => error);

  // Misma respuesta para ambos: el atacante no puede distinguir "no es tuyo"
  // de "no existe", asi que no puede enumerar pedidos ajenos.
  assert.equal(foreign.status, 404);
  assert.equal(foreign.code, 'ORDER_NOT_FOUND');
  assert.equal(missing.status, foreign.status);
  assert.equal(missing.code, foreign.code);
  assert.equal(missing.message, foreign.message);
});

test('a guest order belongs to nobody and cannot be claimed by any account', async () => {
  const service = createOrderService(ownershipDependencies(storedOrders));

  for (const customer of [OWNER, INTRUDER]) {
    await assert.rejects(
      () => service.getOwnOrder(503, customer),
      (error) => error.status === 404 && error.code === 'ORDER_NOT_FOUND',
    );
  }
});
