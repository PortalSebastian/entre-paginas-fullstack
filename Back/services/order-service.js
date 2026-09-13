import { randomBytes } from 'node:crypto';

import { AppError } from '../errors/app-error.js';
import { assertOrderTransition, calculateOrderTotals, ORDER_TRANSITIONS } from './order-rules.js';

export function defaultOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `EP-${date}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function publicOrder(order, totals, payload) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    buyer: {
      name: payload.buyer.name,
      email: payload.buyer.email,
    },
    shipping: {
      methodName: order.shippingMethodName,
      requestedDate: payload.shipping.requestedDate,
    },
    items: totals.items,
    subtotal: totals.subtotal,
    shippingCost: totals.shippingCost,
    total: totals.total,
    payment: {
      brand: payload.payment.brand,
      lastFour: payload.payment.lastFour,
      status: 'SIMULATED_APPROVED',
    },
    createdAt: order.createdAt ?? new Date().toISOString(),
  };
}

export function createOrderService(dependencies) {
  const {
    sequelize,
    Product,
    ShippingMethod,
    Order,
    OrderItem,
    OrderStatusHistory,
    generateOrderNumber = defaultOrderNumber,
    now = () => new Date(),
  } = dependencies;

  const administrativeIncludes = [
    { association: 'items' },
    { association: 'statusHistory', include: [{ association: 'changedBy', attributes: ['id', 'firstName', 'lastName', 'email'] }] },
  ];

  async function createOrder(payload, authenticatedUser = null) {
    return sequelize.transaction(async (transaction) => {
      const productIds = payload.items.map((item) => item.productId).sort((left, right) => left - right);
      const products = await Product.findAll({
        where: { id: productIds },
        transaction,
        lock: transaction.LOCK.UPDATE,
        order: [['id', 'ASC']],
      });
      const productById = new Map(products.map((product) => [Number(product.id), product]));

      const pricedItems = payload.items.map((requestedItem) => {
        const product = productById.get(requestedItem.productId);
        if (!product || !product.isActive) {
          throw new AppError(404, 'PRODUCT_NOT_AVAILABLE', 'A requested product is not available.');
        }
        if (product.stock < requestedItem.quantity) {
          throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${product.title}.`);
        }
        return {
          productId: product.id,
          title: product.title,
          unitPrice: product.price,
          quantity: requestedItem.quantity,
        };
      });

      const shippingMethod = await ShippingMethod.findOne({
        where: { code: payload.shipping.methodCode, isActive: true },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!shippingMethod) {
        throw new AppError(404, 'SHIPPING_METHOD_NOT_AVAILABLE', 'The shipping method is not available.');
      }

      const totals = calculateOrderTotals(pricedItems, shippingMethod.price);
      const order = await Order.create({
        orderNumber: generateOrderNumber(),
        userId: authenticatedUser?.id ?? null,
        buyerName: payload.buyer.name,
        document: payload.buyer.document,
        email: payload.buyer.email,
        phone: payload.buyer.phone,
        address: payload.shipping.address,
        district: payload.shipping.district,
        city: payload.shipping.city,
        addressReference: payload.shipping.reference,
        requestedDeliveryDate: payload.shipping.requestedDate,
        shippingMethodId: shippingMethod.id,
        shippingMethodName: shippingMethod.name,
        subtotal: totals.subtotal,
        shippingCost: totals.shippingCost,
        total: totals.total,
        paymentBrand: payload.payment.brand,
        paymentLastFour: payload.payment.lastFour,
        paymentStatus: 'SIMULATED_APPROVED',
        status: 'PENDING',
      }, { transaction });

      await OrderItem.bulkCreate(
        totals.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          productTitle: item.title,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
        { transaction },
      );

      for (const requestedItem of payload.items) {
        const product = productById.get(requestedItem.productId);
        product.stock -= requestedItem.quantity;
        await product.save({ transaction });
      }

      await OrderStatusHistory.create({
        orderId: order.id,
        changedByUserId: null,
        fromStatus: null,
        toStatus: 'PENDING',
      }, { transaction });

      return publicOrder(order, totals, payload);
    });
  }

  async function updateStatus(orderId, nextStatus, administrator) {
    return sequelize.transaction(async (transaction) => {
      const order = await Order.findByPk(orderId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

      const previousStatus = order.status;
      assertOrderTransition(previousStatus, nextStatus);

      if (nextStatus === 'CANCELLED' && !order.stockRestoredAt) {
        const items = await OrderItem.findAll({ where: { orderId }, transaction });
        const products = await Product.findAll({
          where: { id: items.map((item) => Number(item.productId)).sort((left, right) => left - right) },
          transaction,
          lock: transaction.LOCK.UPDATE,
          order: [['id', 'ASC']],
        });
        const productById = new Map(products.map((product) => [Number(product.id), product]));

        for (const item of items) {
          const product = productById.get(Number(item.productId));
          if (!product) throw new AppError(409, 'PRODUCT_HISTORY_INCONSISTENT', 'An order product no longer exists.');
          product.stock += item.quantity;
          await product.save({ transaction });
        }
        order.stockRestoredAt = now();
      }

      await order.update({ status: nextStatus, stockRestoredAt: order.stockRestoredAt }, { transaction });
      await OrderStatusHistory.create({
        orderId: order.id,
        changedByUserId: administrator.id,
        fromStatus: previousStatus,
        toStatus: nextStatus,
      }, { transaction });

      return order;
    });
  }

  async function listOrders(filters = {}) {
    const where = {};
    if (filters.status) {
      const status = String(filters.status).trim().toUpperCase();
      if (!(status in ORDER_TRANSITIONS)) {
        throw new AppError(422, 'INVALID_ORDER_STATUS', 'Order status is invalid.');
      }
      where.status = status;
    }
    return Order.findAll({ where, include: administrativeIncludes, order: [['createdAt', 'DESC']] });
  }

  async function getOrder(orderId) {
    const order = await Order.findByPk(orderId, { include: administrativeIncludes });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    return order;
  }

  // --- Consultas del cliente sobre sus propios pedidos ---------------------
  // A diferencia de listOrders/getOrder, que son administrativas, estas dos
  // acotan el resultado al usuario autenticado. La pertenencia se comprueba en
  // el servidor a partir de la identidad del token, nunca de un dato que el
  // cliente pueda enviar.

  function customerOrder(order) {
    return {
      id: Number(order.id),
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      shippingMethodName: order.shippingMethodName,
      requestedDeliveryDate: order.requestedDeliveryDate,
      createdAt: order.createdAt,
      items: (order.items ?? []).map((item) => ({
        productId: Number(item.productId),
        title: item.productTitle,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        lineTotal: Number(item.lineTotal),
      })),
    };
  }

  async function listOwnOrders(authenticatedUser) {
    const orders = await Order.findAll({
      where: { userId: authenticatedUser.id },
      include: [{ association: 'items' }],
      order: [['createdAt', 'DESC']],
    });
    return orders.map(customerOrder);
  }

  async function getOwnOrder(orderId, authenticatedUser) {
    const order = await Order.findByPk(orderId, { include: [{ association: 'items' }] });

    // Un pedido ajeno y un pedido inexistente responden exactamente igual. Si
    // el ajeno devolviera 403, el atacante podria recorrer identificadores para
    // averiguar cuantos pedidos existen y cuales; el 404 no revela nada.
    if (!order || order.userId === null || Number(order.userId) !== Number(authenticatedUser.id)) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }
    return customerOrder(order);
  }

  return { createOrder, updateStatus, listOrders, getOrder, listOwnOrders, getOwnOrder };
}
