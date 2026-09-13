import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';

export function createAccessToken(user, options) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      type: 'access',
    },
    options.secret,
    { subject: String(user.id), expiresIn: options.expiresIn },
  );
}

export function verifyAccessToken(token, options) {
  const payload = jwt.verify(token, options.secret);
  if (payload.type !== 'access') throw new Error('Invalid access token type.');
  return payload;
}

export function createRefreshToken({ userId, sessionId }, options) {
  return jwt.sign(
    { sid: sessionId, type: 'refresh' },
    options.secret,
    { subject: String(userId), expiresIn: options.expiresIn },
  );
}

export function verifyRefreshToken(token, options) {
  const payload = jwt.verify(token, options.secret);
  if (payload.type !== 'refresh') throw new Error('Invalid refresh token type.');
  return payload;
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
