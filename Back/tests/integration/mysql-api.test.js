import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import request from 'supertest';

import { loadConfig, assertTestDatabaseName } from '../../config/env.js';
import { createRuntime } from '../../runtime.js';
import { hashPassword } from '../../security/password-service.js';

dotenv.config({ path: '.env.test', quiet: true });

const config = loadConfig(process.env);
assertTestDatabaseName(config.database.name);
const runtime = createRuntime(config);
const unique = `${Date.now()}-${process.pid}`;
const registeredEmail = `integration-${unique}@example.org`;
const adminEmail = `integration-admin-${unique}@example.org`;
let adminId;
let registeredId;
let connected = false;
const createdOrderIds = [];

function futureDate() {
  return new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
}

function orderPayload(quantity) {
  return {
    buyer: {
      name: 'Cliente Integración',
      document: '12345678',
      email: registeredEmail,
      phone: '987654321',
    },
    shipping: {
      address: 'Calle de prueba 123',
      district: 'Centro',
      city: 'lima',
      reference: 'Puerta azul',
      requestedDate: futureDate(),
      methodCode: 'standard',
    },
    payment: { brand: 'visa', lastFour: '4242' },
    items: [{ productId: 101, quantity }],
  };
}

before(async () => {
  await runtime.sequelize.authenticate();
  connected = true;
  const product = await runtime.models.Product.findByPk(101);
  assert.ok(product, 'Run the public-data seeder before the integration suite.');
  await product.update({ stock: 20, isActive: true });

  const administrator = await runtime.models.User.create({
    firstName: 'Admin',
    lastName: 'Integración',
    email: adminEmail,
    phone: '900000001',
    birthDate: '1990-01-01',
    readingPreference: null,
    newsletterOptIn: false,
    termsAcceptedAt: new Date(),
    passwordHash: await hashPassword('admin-test-123'),
    role: 'ADMIN',
    isActive: true,
  });
  adminId = administrator.id;
});

after(async () => {
  if (!connected) return;
  const { OrderStatusHistory, OrderItem, Order, RefreshToken, User, Product } = runtime.models;
  if (createdOrderIds.length > 0) {
    await OrderStatusHistory.destroy({ where: { orderId: createdOrderIds } });
    await OrderItem.destroy({ where: { orderId: createdOrderIds } });
    await Order.destroy({ where: { id: createdOrderIds } });
  }
  await RefreshToken.destroy({ where: { userId: [adminId, registeredId].filter(Boolean) } });
  await User.destroy({ where: { email: [registeredEmail, adminEmail] } });
  await Product.update({ stock: 20, isActive: true }, { where: { id: 101 } });
  await runtime.sequelize.close();
});

async function csrfToken(agent) {
  const response = await agent.get('/api/v1/csrf').expect(200);
  return response.body.data.csrfToken;
}

test('MySQL integration covers auth, transactional stock and one-time cancellation', async () => {
  const agent = request.agent(runtime.app);
  let token = await csrfToken(agent);
  const registration = await agent
    .post('/api/v1/auth/register')
    .set('x-csrf-token', token)
    .send({
      firstName: 'Cliente',
      lastName: 'Integración',
      email: registeredEmail,
      phone: '987654321',
      birthDate: '1995-05-10',
      password: 'customer-test-123',
      readingPreference: 'Ficción',
      newsletterOptIn: false,
      termsAccepted: true,
    })
    .expect(201);
  assert.equal(registration.body.data.email, registeredEmail);
  assert.equal('passwordHash' in registration.body.data, false);
  registeredId = registration.body.data.id;

  token = await csrfToken(agent);
  const login = await agent
    .post('/api/v1/auth/login')
    .set('x-csrf-token', token)
    .send({ email: registeredEmail, password: 'customer-test-123' })
    .expect(200);
  assert.ok(login.body.data.accessToken);
  assert.match(login.headers['set-cookie'][0], /HttpOnly/);

  token = await csrfToken(agent);
  const refreshed = await agent
    .post('/api/v1/auth/refresh')
    .set('Origin', config.frontendOrigin)
    .set('x-csrf-token', token)
    .expect(200);
  assert.ok(refreshed.body.data.accessToken);

  const product = await runtime.models.Product.findByPk(101);
  const originalPrice = Number(product.price);
  const shippingMethod = await runtime.models.ShippingMethod.findOne({ where: { code: 'standard' } });
  token = await csrfToken(agent);
  const created = await agent
    .post('/api/v1/orders')
    .set('x-csrf-token', token)
    .send(orderPayload(2))
    .expect(201);
  createdOrderIds.push(created.body.data.id);
  assert.equal(Number(created.body.data.total), originalPrice * 2 + Number(shippingMethod.price));
  await product.reload();
  assert.equal(product.stock, 18);

  await product.update({ stock: 1 });
  token = await csrfToken(agent);
  const rejected = await agent
    .post('/api/v1/orders')
    .set('x-csrf-token', token)
    .send(orderPayload(2))
    .expect(409);
  assert.equal(rejected.body.error.code, 'INSUFFICIENT_STOCK');
  await product.reload();
  assert.equal(product.stock, 1);
  await product.update({ stock: 18 });

  const adminAgent = request.agent(runtime.app);
  let adminToken = await csrfToken(adminAgent);
  const adminLogin = await adminAgent
    .post('/api/v1/auth/login')
    .set('x-csrf-token', adminToken)
    .send({ email: adminEmail, password: 'admin-test-123' })
    .expect(200);
  const authorization = `Bearer ${adminLogin.body.data.accessToken}`;

  adminToken = await csrfToken(adminAgent);
  await adminAgent
    .patch(`/api/v1/admin/orders/${created.body.data.id}/status`)
    .set('Authorization', authorization)
    .set('x-csrf-token', adminToken)
    .send({ status: 'CANCELLED' })
    .expect(200);
  await product.reload();
  assert.equal(product.stock, 20);

  adminToken = await csrfToken(adminAgent);
  await adminAgent
    .patch(`/api/v1/admin/orders/${created.body.data.id}/status`)
    .set('Authorization', authorization)
    .set('x-csrf-token', adminToken)
    .send({ status: 'CANCELLED' })
    .expect(409);
  await product.reload();
  assert.equal(product.stock, 20);

  token = await csrfToken(agent);
  await agent
    .post('/api/v1/auth/logout')
    .set('Origin', config.frontendOrigin)
    .set('x-csrf-token', token)
    .expect(204);
});
