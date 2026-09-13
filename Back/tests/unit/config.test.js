import test from 'node:test';
import assert from 'node:assert/strict';

import { assertTestDatabaseName, loadConfig } from '../../config/env.js';

const validEnvironment = {
  NODE_ENV: 'development',
  PORT: '3000',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_NAME: 'entre_paginas',
  DB_USER: 'app_user',
  DB_PASSWORD: 'database-secret',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  CSRF_SECRET: 'c'.repeat(32),
};

test('loadConfig parses the approved environment contract', () => {
  const config = loadConfig(validEnvironment);

  assert.equal(config.port, 3000);
  assert.equal(config.database.port, 3306);
  assert.equal(config.database.name, 'entre_paginas');
  assert.equal(config.refreshCookieName, 'refresh_token');
  assert.equal(config.refreshCookieMaxAge, 604_800_000);
});

test('loadConfig rejects missing or short JWT secrets', () => {
  assert.throws(
    () => loadConfig({ ...validEnvironment, JWT_ACCESS_SECRET: 'short' }),
    /JWT_ACCESS_SECRET must contain at least 32 characters/,
  );
});

test('loadConfig requires independent access and refresh secrets', () => {
  assert.throws(
    () => loadConfig({
      ...validEnvironment,
      JWT_REFRESH_SECRET: validEnvironment.JWT_ACCESS_SECRET,
    }),
    /must be different/,
  );
});

test('loadConfig demands a CSRF secret distinct from the JWT secrets', () => {
  assert.throws(
    () => loadConfig({ ...validEnvironment, CSRF_SECRET: undefined }),
    /CSRF_SECRET is required/,
  );
  assert.throws(
    () => loadConfig({ ...validEnvironment, CSRF_SECRET: 'short' }),
    /CSRF_SECRET must contain at least 32 characters/,
  );
  assert.throws(
    () => loadConfig({ ...validEnvironment, CSRF_SECRET: validEnvironment.JWT_ACCESS_SECRET }),
    /CSRF_SECRET must differ from the JWT secrets/,
  );
});

test('assertTestDatabaseName rejects any non-test database', () => {
  assert.doesNotThrow(() => assertTestDatabaseName('entre_paginas_test'));
  assert.throws(() => assertTestDatabaseName('entre_paginas'), /must end in _test/);
});
