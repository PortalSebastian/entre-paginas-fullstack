import { AppError } from '../errors/app-error.js';

function publicUser(user) {
  const value = typeof user.toJSON === 'function' ? user.toJSON() : user;
  return {
    id: value.id,
    firstName: value.firstName,
    lastName: value.lastName,
    email: value.email,
    phone: value.phone,
    birthDate: value.birthDate,
    readingPreference: value.readingPreference,
    newsletterOptIn: value.newsletterOptIn,
    role: value.role,
    isActive: value.isActive,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function createUserService({ User, sequelize }) {
  async function findUser(id, options = {}) {
    const user = await User.findByPk(id, options);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    return user;
  }

  return {
    async list() {
      const users = await User.findAll({ order: [['id', 'ASC']] });
      return users.map(publicUser);
    },
    async get(id) {
      return publicUser(await findUser(id));
    },
    async updateStatus(id, isActive) {
      return sequelize.transaction(async (transaction) => {
        let activeAdministrators = [];
        if (!isActive) {
          activeAdministrators = await User.findAll({
            where: { role: 'ADMIN', isActive: true },
            transaction,
            lock: transaction.LOCK.UPDATE,
            order: [['id', 'ASC']],
          });
        }

        const lockedAdministrator = activeAdministrators.find(
          (administrator) => String(administrator.id) === String(id),
        );
        const user = lockedAdministrator ?? await findUser(id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!isActive && user.role === 'ADMIN' && user.isActive && activeAdministrators.length <= 1) {
          throw new AppError(409, 'LAST_ADMIN_REQUIRED', 'The last active administrator cannot be disabled.');
        }
        await user.update({ isActive }, { transaction });
        return publicUser(user);
      });
    },
  };
}
