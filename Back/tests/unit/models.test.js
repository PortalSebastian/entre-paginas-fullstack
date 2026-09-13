import test from 'node:test';
import assert from 'node:assert/strict';
import { Sequelize } from 'sequelize';

import { createModels } from '../../models/index.js';

test('createModels defines the approved tables and relationships', () => {
  const sequelize = new Sequelize('entre_paginas', 'test', 'test', {
    dialect: 'mysql',
    logging: false,
  });
  const models = createModels(sequelize);

  assert.deepEqual(
    Object.values(models).map((model) => model.getTableName()).sort(),
    [
      'categories',
      'order_items',
      'order_status_history',
      'orders',
      'products',
      'refresh_tokens',
      'shipping_methods',
      'users',
    ],
  );
  assert.equal(models.Order.rawAttributes.userId.allowNull, true);
  assert.equal(models.Order.associations.items.target, models.OrderItem);
  assert.equal(models.Product.associations.category.target, models.Category);
  assert.equal(models.OrderItem.rawAttributes.orderId.onDelete, 'RESTRICT');
  assert.equal(models.RefreshToken.rawAttributes.tokenHash.unique, true);
});
