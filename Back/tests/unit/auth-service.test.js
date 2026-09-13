import test from 'node:test';
import assert from 'node:assert/strict';

import { createAuthService } from '../../services/auth-service.js';

function buildFixture() {
  const users = [];
  const tokens = [];
  const transactionCalls = [];
  let userId = 1;
  return {
    users,
    tokens,
    transactionCalls,
    dependencies: {
      sequelize: {
        async transaction(work) {
          const transaction = { LOCK: { UPDATE: 'UPDATE' } };
          transactionCalls.push(transaction);
          return work(transaction);
        },
      },
      User: {
        async findOne({ where }) {
          return users.find((user) => user.email === where.email) ?? null;
        },
        async findByPk(id) {
          return users.find((user) => user.id === Number(id)) ?? null;
        },
        async create(values) {
          const user = { id: userId++, ...values };
          users.push(user);
          return user;
        },
      },
      RefreshToken: {
        async create(values) {
          const token = { id: tokens.length + 1, revokedAt: null, ...values };
          tokens.push(token);
          return token;
        },
        async findOne({ where }) {
          return tokens.find((token) => token.tokenHash === where.tokenHash) ?? null;
        },
      },
      hashPassword: async (password) => `hashed:${password}`,
      verifyPassword: async (password, hash) => hash === `hashed:${password}`,
      accessSecret: 'access-secret-long-enough-for-tests',
      refreshSecret: 'refresh-secret-long-enough-for-tests',
      sessionId: () => `session-${tokens.length + 1}`,
      now: () => new Date('2026-09-02T15:00:00.000Z'),
    },
  };
}

const registration = {
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@example.org',
  phone: '987654321',
  birthDate: '2000-05-10',
  password: 'secreto8',
  readingPreference: 'ficcion',
  newsletterOptIn: true,
  termsAccepted: true,
};

test('register stores a password hash and returns no secret fields', async () => {
  const fixture = buildFixture();
  const service = createAuthService(fixture.dependencies);

  const user = await service.register(registration);

  assert.equal(fixture.users[0].passwordHash, 'hashed:secreto8');
  assert.equal(fixture.users[0].role, 'CUSTOMER');
  assert.equal(fixture.users[0].termsAcceptedAt.toISOString(), '2026-09-02T15:00:00.000Z');
  assert.equal(user.email, 'ana@example.org');
  assert.equal('passwordHash' in user, false);
  assert.equal('password' in user, false);
});

test('register maps a concurrent unique-email conflict to the public API error', async () => {
  const service = createAuthService({
    User: {
      async findOne() { return null; },
      async create() {
        const error = new Error('Duplicate entry');
        error.name = 'SequelizeUniqueConstraintError';
        throw error;
      },
    },
    RefreshToken: {},
    hashPassword: async () => 'hash',
    accessSecret: 'access-secret-long-enough-for-tests',
    refreshSecret: 'refresh-secret-long-enough-for-tests',
  });

  await assert.rejects(
    () => service.register(registration),
    (error) => error.code === 'EMAIL_ALREADY_REGISTERED' && error.status === 409,
  );
});

test('login issues access and refresh tokens and stores only the refresh hash', async () => {
  const fixture = buildFixture();
  const service = createAuthService(fixture.dependencies);
  await service.register(registration);

  const session = await service.login('ana@example.org', 'secreto8');

  assert.ok(session.accessToken);
  assert.ok(session.refreshToken);
  assert.equal(session.user.email, 'ana@example.org');
  assert.equal(fixture.tokens.length, 1);
  assert.equal(fixture.tokens[0].tokenHash.length, 64);
  assert.notEqual(fixture.tokens[0].tokenHash, session.refreshToken);
});

test('login rejects inactive accounts with a generic authentication error', async () => {
  const fixture = buildFixture();
  const service = createAuthService(fixture.dependencies);
  await service.register(registration);
  fixture.users[0].isActive = false;

  await assert.rejects(
    () => service.login('ana@example.org', 'secreto8'),
    (error) => error.code === 'INVALID_CREDENTIALS' && error.status === 401,
  );
});

test('refresh rotates the persisted token and logout revokes the replacement', async () => {
  const fixture = buildFixture();
  const service = createAuthService(fixture.dependencies);
  await service.register(registration);
  const first = await service.login('ana@example.org', 'secreto8');

  const rotated = await service.refresh(first.refreshToken);
  assert.ok(fixture.tokens[0].revokedAt);
  assert.equal(fixture.tokens.length, 2);
  assert.notEqual(rotated.refreshToken, first.refreshToken);

  await service.logout(rotated.refreshToken);
  assert.ok(fixture.tokens[1].revokedAt);
  assert.equal(fixture.transactionCalls.length, 2);
});

test('login explicitly requests the password scope from a Sequelize user model', async () => {
  const fixture = buildFixture();
  const user = {
    id: 8,
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@example.org',
    passwordHash: 'hashed:secreto8',
    role: 'CUSTOMER',
    isActive: true,
  };
  fixture.dependencies.User = {
    scope(name) {
      assert.equal(name, 'withPassword');
      return { async findOne() { return user; } };
    },
    async findOne() { throw new Error('Default scope must not be used for login.'); },
  };
  const service = createAuthService(fixture.dependencies);

  const session = await service.login('ana@example.org', 'secreto8');
  assert.equal(session.user.id, 8);
});
