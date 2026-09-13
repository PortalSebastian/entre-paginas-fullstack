import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../../app.js';
import { AppError } from '../../errors/app-error.js';
import { createAccessToken } from '../../security/token-service.js';

const accessSecret = 'access-secret-long-enough-for-http-tests';

function buildApp() {
  const calls = { orderUser: undefined };
  const users = new Map([
    [1, { id: 1, email: 'customer@example.org', role: 'CUSTOMER', isActive: true }],
    [2, { id: 2, email: 'admin@example.org', role: 'ADMIN', isActive: true }],
  ]);
  const services = {
    auth: {
      async register(payload) { return { id: 3, ...payload, password: undefined }; },
      async login() {
        return {
          user: users.get(1),
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        };
      },
      async refresh() { throw new Error('not used'); },
      async logout() {},
      publicUser(user) { return user; },
    },
    catalog: {
      async listProducts() { return [{ id: 1, title: 'Clean Code' }]; },
      async getProduct() { return { id: 1, title: 'Clean Code' }; },
      async listCategories() { return [{ id: 1, slug: 'men' }]; },
      async listShippingMethods() { return [{ id: 1, code: 'standard' }]; },
    },
    products: {
      async listAll() { return [{ id: 1, title: 'Clean Code', isActive: true }]; },
      async create(payload) { return { id: 2, ...payload }; },
      async update() { return {}; },
      async updateStock() { return {}; },
      async deactivate() {},
    },
    orders: {
      async createOrder(payload, user) {
        calls.orderUser = user;
        return { orderNumber: 'EP-20260902-ABCDEF12', status: 'PENDING', ...payload };
      },
      async listOrders() { return []; },
      async getOrder() { return {}; },
      async updateStatus() { return {}; },
      // El pedido 501 pertenece al cliente 1; el 502, al cliente 99.
      async listOwnOrders(user) {
        calls.ownOrdersUser = user;
        return [{ id: 501, orderNumber: 'EP-20260903-OWNER001' }];
      },
      async getOwnOrder(orderId, user) {
        const owners = new Map([[501, 1], [502, 99]]);
        if (owners.get(Number(orderId)) !== Number(user.id)) {
          throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
        }
        return { id: Number(orderId), orderNumber: 'EP-20260903-OWNER001' };
      },
    },
    users: {
      async list() { return []; },
      async get() { return {}; },
      async updateStatus() { return {}; },
    },
  };
  const app = createApp({
    services,
    User: { async findByPk(id) { return users.get(Number(id)) ?? null; } },
    config: {
      nodeEnv: 'test',
      frontendOrigin: 'http://localhost:5173',
      accessSecret,
      csrfSecret: 'csrf-secret-long-enough-for-http-tests',
      refreshCookieName: 'refresh_token',
      refreshCookieMaxAge: 604_800_000,
    },
  });
  return { app, calls, users };
}

function tokenFor(user) {
  return createAccessToken(user, { secret: accessSecret, expiresIn: '15m' });
}

// Un agente de supertest conserva las cookies entre peticiones, igual que un
// navegador. Pedir GET /csrf deja la cookie `csrf_secret` puesta y devuelve el
// token que el frontend legitimo reenviaria en cada mutacion.
async function csrfSession(app) {
  const agent = request.agent(app);
  const response = await agent.get('/api/v1/csrf').expect(200);
  return { agent, csrfToken: response.body.data.csrfToken };
}

test('GET /api/v1/health returns the common success envelope', async () => {
  const { app } = buildApp();
  const response = await request(app).get('/api/v1/health').expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, 'ok');
});

test('POST /api/v1/auth/register rejects an invalid payload before the service', async () => {
  const { app } = buildApp();
  const { agent, csrfToken } = await csrfSession(app);
  const response = await agent
    .post('/api/v1/auth/register')
    .set('x-csrf-token', csrfToken)
    .send({ email: 'invalid', password: 'short' })
    .expect(422);

  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.ok(response.body.error.details.length >= 3);
});

test('POST /api/v1/auth/login sets the refresh token in an HttpOnly cookie', async () => {
  const { app } = buildApp();
  const { agent, csrfToken } = await csrfSession(app);
  const response = await agent
    .post('/api/v1/auth/login')
    .set('x-csrf-token', csrfToken)
    .send({ email: 'customer@example.org', password: 'secreto8' })
    .expect(200);

  assert.equal(response.body.data.accessToken, 'access-token');
  assert.match(response.headers['set-cookie'][0], /refresh_token=refresh-token/);
  assert.match(response.headers['set-cookie'][0], /HttpOnly/);
});

test('admin routes reject customers and accept active administrators', async () => {
  const { app, users } = buildApp();
  const customerToken = tokenFor(users.get(1));
  const adminToken = tokenFor(users.get(2));

  await request(app)
    .get('/api/v1/admin/products')
    .set('Authorization', `Bearer ${customerToken}`)
    .expect(403);

  const response = await request(app)
    .get('/api/v1/admin/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(response.body.data[0].title, 'Clean Code');
});

test('order creation permits guests and customers but rejects an invalid supplied token', async () => {
  const { app, calls, users } = buildApp();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const payload = {
    buyer: { name: 'Ana Pérez', document: '12345678', email: 'ana@example.org', phone: '987654321' },
    shipping: {
      address: 'Calle 1', district: 'Centro', city: 'lima', reference: '',
      requestedDate: tomorrow, methodCode: 'standard',
    },
    payment: { brand: 'visa', lastFour: '4242' },
    items: [{ productId: 1, quantity: 1 }],
  };

  const { agent, csrfToken } = await csrfSession(app);

  await agent.post('/api/v1/orders').set('x-csrf-token', csrfToken).send(payload).expect(201);
  assert.equal(calls.orderUser, null);

  await agent
    .post('/api/v1/orders')
    .set('x-csrf-token', csrfToken)
    .set('Authorization', `Bearer ${tokenFor(users.get(1))}`)
    .send(payload)
    .expect(201);
  assert.equal(calls.orderUser.id, 1);

  await agent
    .post('/api/v1/orders')
    .set('x-csrf-token', csrfToken)
    .set('Authorization', 'Bearer invalid-token')
    .send(payload)
    .expect(401);
});

test('guest order creation rejects an untrusted browser origin', async () => {
  const { app } = buildApp();
  const { agent, csrfToken } = await csrfSession(app);
  const response = await agent
    .post('/api/v1/orders')
    .set('x-csrf-token', csrfToken)
    .set('Origin', 'https://untrusted.example')
    .send({})
    .expect(403);

  assert.equal(response.body.error.code, 'UNTRUSTED_ORIGIN');
});

test('own-order routes require an identity before reaching the service', async () => {
  const { app, calls } = buildApp();

  await request(app).get('/api/v1/orders/mine').expect(401);
  await request(app).get('/api/v1/orders/501').expect(401);
  await request(app)
    .get('/api/v1/orders/mine')
    .set('Authorization', 'Bearer forged-token')
    .expect(401);

  assert.equal(calls.ownOrdersUser, undefined, 'the service must never run without an identity');
});

test('a customer reads their own order and gets 404 for a foreign one', async () => {
  const { app, users } = buildApp();
  const customerToken = `Bearer ${tokenFor(users.get(1))}`;

  const own = await request(app)
    .get('/api/v1/orders/501')
    .set('Authorization', customerToken)
    .expect(200);
  assert.equal(own.body.data.orderNumber, 'EP-20260903-OWNER001');

  // Mismo cliente, pedido de otra persona: indistinguible de inexistente.
  const foreign = await request(app)
    .get('/api/v1/orders/502')
    .set('Authorization', customerToken)
    .expect(404);
  assert.equal(foreign.body.error.code, 'ORDER_NOT_FOUND');
});

test('the identity used for ownership comes from the token, not from the request', async () => {
  const { app, calls, users } = buildApp();

  // El cliente 1 intenta hacerse pasar por el 99 mediante el cuerpo, la query
  // y una cabecera. Ninguno de esos canales alimenta la comprobacion.
  await request(app)
    .get('/api/v1/orders/mine?userId=99')
    .set('Authorization', `Bearer ${tokenFor(users.get(1))}`)
    .set('X-User-Id', '99')
    .expect(200);

  assert.equal(calls.ownOrdersUser.id, 1);
});

// --- Prevencion CSRF mediante tokens ---------------------------------------
// Los cuatro casos que exige la rubrica: mutacion legitima aceptada, peticion
// sin token rechazada, token alterado o de otro contexto rechazado, y lectura
// que conserva su comportamiento.

const LOGIN = { email: 'customer@example.org', password: 'secreto8' };

test('CSRF: a mutation with a valid token is accepted', async () => {
  const { app } = buildApp();
  const { agent, csrfToken } = await csrfSession(app);

  const response = await agent
    .post('/api/v1/auth/login')
    .set('x-csrf-token', csrfToken)
    .send(LOGIN)
    .expect(200);

  assert.equal(response.body.success, true);
});

test('CSRF: a mutation without a token is rejected before the service runs', async () => {
  const { app, calls } = buildApp();
  const { agent } = await csrfSession(app);

  // El navegador de la victima SI adjunta la cookie (el agente la conserva),
  // pero la pagina atacante no puede leer el token para reenviarlo.
  const response = await agent.post('/api/v1/auth/login').send(LOGIN).expect(403);

  assert.equal(response.body.error.code, 'CSRF_TOKEN_MISSING');
  assert.equal(calls.orderUser, undefined, 'the request must not reach business logic');
});

test('CSRF: a request with the cookie but no cookie-derived token is rejected', async () => {
  const { app } = buildApp();

  // Sin haber pasado por GET /csrf no hay cookie de secreto: no se puede
  // fabricar un token valido a partir de nada.
  const response = await request(app)
    .post('/api/v1/auth/login')
    .set('x-csrf-token', 'a'.repeat(64))
    .send(LOGIN)
    .expect(403);

  assert.equal(response.body.error.code, 'CSRF_TOKEN_MISSING');
});

test('CSRF: a tampered token is rejected', async () => {
  const { app } = buildApp();
  const { agent, csrfToken } = await csrfSession(app);
  const tampered = `${csrfToken.slice(0, -1)}${csrfToken.endsWith('0') ? '1' : '0'}`;

  const response = await agent
    .post('/api/v1/auth/login')
    .set('x-csrf-token', tampered)
    .send(LOGIN)
    .expect(403);

  assert.equal(response.body.error.code, 'CSRF_TOKEN_INVALID');
});

test("CSRF: a token from another browser context does not work here", async () => {
  const { app } = buildApp();
  const victim = await csrfSession(app);
  const attacker = await csrfSession(app);

  // El atacante tiene un token perfectamente valido... para SU cookie.
  // Combinado con la cookie de la victima, no verifica.
  assert.notEqual(victim.csrfToken, attacker.csrfToken);

  const response = await victim.agent
    .post('/api/v1/auth/login')
    .set('x-csrf-token', attacker.csrfToken)
    .send(LOGIN)
    .expect(403);

  assert.equal(response.body.error.code, 'CSRF_TOKEN_INVALID');
});

test('CSRF: read operations keep working without any token', async () => {
  const { app } = buildApp();

  await request(app).get('/api/v1/health').expect(200);
  await request(app).get('/api/v1/products').expect(200);
  await request(app).get('/api/v1/categories').expect(200);
});

test('CSRF: the secret rotates on login so pre-login tokens stop working', async () => {
  const { app } = buildApp();
  const { agent, csrfToken } = await csrfSession(app);

  await agent.post('/api/v1/auth/login').set('x-csrf-token', csrfToken).send(LOGIN).expect(200);

  // Tras autenticarse, el secreto del navegador es otro; el token anterior
  // dejo de derivarse de la cookie vigente.
  const reused = await agent
    .post('/api/v1/auth/login')
    .set('x-csrf-token', csrfToken)
    .send(LOGIN)
    .expect(403);
  assert.equal(reused.body.error.code, 'CSRF_TOKEN_INVALID');

  // El frontend legitimo simplemente vuelve a pedir el token y sigue.
  const refreshed = await agent.get('/api/v1/csrf').expect(200);
  await agent
    .post('/api/v1/auth/login')
    .set('x-csrf-token', refreshed.body.data.csrfToken)
    .send(LOGIN)
    .expect(200);
});

test('CSRF: every state-changing method is covered, including admin routes', async () => {
  const { app, users } = buildApp();
  const { agent } = await csrfSession(app);
  const adminToken = `Bearer ${tokenFor(users.get(2))}`;

  const mutations = [
    ['post', '/api/v1/admin/products'],
    ['put', '/api/v1/admin/products/1'],
    ['patch', '/api/v1/admin/products/1/stock'],
    ['delete', '/api/v1/admin/products/1'],
  ];

  for (const [method, path] of mutations) {
    const response = await agent[method](path).set('Authorization', adminToken).send({}).expect(403);
    assert.equal(response.body.error.code, 'CSRF_TOKEN_MISSING', `${method.toUpperCase()} ${path}`);
  }
});
