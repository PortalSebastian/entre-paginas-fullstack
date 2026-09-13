import bcrypt from 'bcryptjs';

const DEFAULT_COST = 12;

export function hashPassword(password, cost = DEFAULT_COST) {
  return bcrypt.hash(password, cost);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
