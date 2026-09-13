'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(254), allowNull: false, unique: true },
      phone: { type: Sequelize.STRING(20), allowNull: false },
      birth_date: { type: Sequelize.DATEONLY, allowNull: false },
      reading_preference: { type: Sequelize.STRING(50), allowNull: true },
      newsletter_opt_in: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      terms_accepted_at: { type: Sequelize.DATE, allowNull: false },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.ENUM('CUSTOMER', 'ADMIN'), allowNull: false, defaultValue: 'CUSTOMER' },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' });

    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      token_hash: { type: Sequelize.CHAR(64), allowNull: false, unique: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' });
    await queryInterface.addIndex('refresh_tokens', ['user_id'], { name: 'idx_refresh_tokens_user_id' });
    await queryInterface.addIndex('refresh_tokens', ['expires_at'], { name: 'idx_refresh_tokens_expires_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('users');
  },
};
