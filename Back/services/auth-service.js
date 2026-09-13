import { randomUUID } from 'node:crypto';

import { AppError } from '../errors/app-error.js';
import { hashPassword as defaultHashPassword, verifyPassword as defaultVerifyPassword } from '../security/password-service.js';
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken,
} from '../security/token-service.js';

const ACCESS_DURATION = '15m';
const REFRESH_DURATION = '7d';
const REFRESH_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    birthDate: user.birthDate,
    readingPreference: user.readingPreference,
    newsletterOptIn: user.newsletterOptIn,
    role: user.role,
    isActive: user.isActive,
  };
}

async function persist(instance, options = {}) {
  if (typeof instance.save === 'function') await instance.save(options);
}

export function createAuthService(dependencies) {
  const {
    User,
    RefreshToken,
    sequelize,
    hashPassword = defaultHashPassword,
    verifyPassword = defaultVerifyPassword,
    accessSecret,
    refreshSecret,
    sessionId = randomUUID,
    now = () => new Date(),
  } = dependencies;

  async function register(payload) {
    const existing = await User.findOne({ where: { email: payload.email } });
    if (existing) {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'The email is already registered.');
    }

    let user;
    try {
      user = await User.create({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        birthDate: payload.birthDate,
        readingPreference: payload.readingPreference,
        newsletterOptIn: payload.newsletterOptIn,
        termsAcceptedAt: now(),
        passwordHash: await hashPassword(payload.password),
        role: 'CUSTOMER',
        isActive: true,
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'The email is already registered.');
      }
      throw error;
    }
    return publicUser(user);
  }

  async function issueSession(user, transaction = null) {
    const accessToken = createAccessToken(user, {
      secret: accessSecret,
      expiresIn: ACCESS_DURATION,
    });
    const refreshToken = createRefreshToken(
      { userId: user.id, sessionId: sessionId() },
      { secret: refreshSecret, expiresIn: REFRESH_DURATION },
    );
    await RefreshToken.create(
      {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(now().getTime() + REFRESH_DURATION_MS),
        revokedAt: null,
      },
      transaction ? { transaction } : undefined,
    );
    return { user: publicUser(user), accessToken, refreshToken };
  }

  async function login(email, password) {
    const loginUserModel = typeof User.scope === 'function' ? User.scope('withPassword') : User;
    const user = await loginUserModel.findOne({ where: { email: email.trim().toLowerCase() } });
    const valid = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!valid || !user.isActive) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    return issueSession(user);
  }

  async function refresh(refreshToken) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken, { secret: refreshSecret });
    } catch {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'The session cannot be renewed.');
    }

    return sequelize.transaction(async (transaction) => {
      const currentTime = now();
      const storedToken = await RefreshToken.findOne({
        where: { tokenHash: hashToken(refreshToken) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!storedToken || storedToken.revokedAt || new Date(storedToken.expiresAt) <= currentTime) {
        throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'The session cannot be renewed.');
      }

      const user = await User.findByPk(payload.sub, { transaction });
      if (!user?.isActive) {
        throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'The session cannot be renewed.');
      }

      storedToken.revokedAt = currentTime;
      await persist(storedToken, { transaction });
      return issueSession(user, transaction);
    });
  }

  async function logout(refreshToken) {
    if (!refreshToken) return;
    await sequelize.transaction(async (transaction) => {
      const storedToken = await RefreshToken.findOne({
        where: { tokenHash: hashToken(refreshToken) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (storedToken && !storedToken.revokedAt) {
        storedToken.revokedAt = now();
        await persist(storedToken, { transaction });
      }
    });
  }

  return { register, login, refresh, logout, publicUser };
}
