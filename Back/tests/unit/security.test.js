import test from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, verifyPassword } from '../../security/password-service.js';
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../security/token-service.js';

const accessSecret = 'access-secret-long-enough-for-tests';
const refreshSecret = 'refresh-secret-long-enough-for-tests';

test('password service hashes a password and verifies only the original value', async () => {
  const passwordHash = await hashPassword('secreto8');

  assert.notEqual(passwordHash, 'secreto8');
  assert.equal(await verifyPassword('secreto8', passwordHash), true);
  assert.equal(await verifyPassword('incorrecta', passwordHash), false);
});

test('access tokens preserve the authenticated identity and role', () => {
  const token = createAccessToken(
    { id: 7, email: 'admin@example.org', role: 'ADMIN' },
    { secret: accessSecret, expiresIn: '15m' },
  );

  const payload = verifyAccessToken(token, { secret: accessSecret });
  assert.equal(payload.sub, '7');
  assert.equal(payload.email, 'admin@example.org');
  assert.equal(payload.role, 'ADMIN');
  assert.equal(payload.type, 'access');
});

test('refresh tokens use an independent secret and produce a stable database hash', () => {
  const token = createRefreshToken(
    { userId: 7, sessionId: 'session-123' },
    { secret: refreshSecret, expiresIn: '7d' },
  );

  const payload = verifyRefreshToken(token, { secret: refreshSecret });
  assert.equal(payload.sub, '7');
  assert.equal(payload.sid, 'session-123');
  assert.equal(payload.type, 'refresh');
  assert.equal(hashToken(token), hashToken(token));
  assert.equal(hashToken(token).length, 64);
  assert.throws(() => verifyRefreshToken(token, { secret: accessSecret }));
});
