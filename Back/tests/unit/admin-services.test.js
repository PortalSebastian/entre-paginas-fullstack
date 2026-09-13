import test from 'node:test';
import assert from 'node:assert/strict';

import { createProductService } from '../../services/product-service.js';
import { createUserService } from '../../services/user-service.js';

test('user service refuses to deactivate the last active administrator', async () => {
  const administrator = { id: 1, role: 'ADMIN', isActive: true };
  let transactionUsed = false;
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const service = createUserService({
    sequelize: {
      async transaction(work) {
        transactionUsed = true;
        return work(transaction);
      },
    },
    User: {
      async findByPk(_id, options) {
        assert.equal(options.transaction, transaction);
        assert.equal(options.lock, 'UPDATE');
        return administrator;
      },
      async findAll(options) {
        assert.equal(options.transaction, transaction);
        assert.equal(options.lock, 'UPDATE');
        return [administrator];
      },
    },
  });

  await assert.rejects(
    () => service.updateStatus(1, false, administrator),
    (error) => error.code === 'LAST_ADMIN_REQUIRED' && error.status === 409,
  );
  assert.equal(administrator.isActive, true);
  assert.equal(transactionUsed, true);
});

test('product service rejects negative or fractional stock', async () => {
  const product = { id: 1, stock: 5, async update(values) { Object.assign(this, values); } };
  const service = createProductService({
    Product: { async findByPk() { return product; } },
    Category: {},
  });

  await assert.rejects(() => service.updateStock(1, -1), (error) => error.code === 'VALIDATION_ERROR');
  await assert.rejects(() => service.updateStock(1, 1.5), (error) => error.code === 'VALIDATION_ERROR');
  assert.equal(product.stock, 5);
});

test('product stock updates lock the row inside a transaction', async () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const product = {
    id: 1,
    stock: 5,
    category: { slug: 'men' },
    async update(values, options) {
      assert.equal(options.transaction, transaction);
      Object.assign(this, values);
    },
  };
  const service = createProductService({
    sequelize: { async transaction(work) { return work(transaction); } },
    Product: {
      async findByPk(_id, options) {
        assert.equal(options.transaction, transaction);
        assert.equal(options.lock, 'UPDATE');
        return product;
      },
    },
    Category: {},
  });

  const updated = await service.updateStock(1, 7);
  assert.equal(updated.stock, 7);
});

test('deactivate product performs a soft delete', async () => {
  const product = { id: 1, isActive: true, async update(values) { Object.assign(this, values); } };
  const service = createProductService({
    sequelize: { async transaction(work) { return work({ LOCK: { UPDATE: 'UPDATE' } }); } },
    Product: { async findByPk() { return product; } },
    Category: {},
  });

  await service.deactivate(1);
  assert.equal(product.isActive, false);
});
