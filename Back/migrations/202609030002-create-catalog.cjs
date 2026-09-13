'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      id: { type: Sequelize.SMALLINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      slug: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(60), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' });

    await queryInterface.createTable('products', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: false },
      author: { type: Sequelize.STRING(200), allowNull: false },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      category_id: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      genre: { type: Sequelize.STRING(100), allowNull: false },
      format: { type: Sequelize.STRING(50), allowNull: false },
      short_description: { type: Sequelize.STRING(500), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      cover_url: { type: Sequelize.STRING(2048), allowNull: false },
      stock: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' });
    await queryInterface.addIndex('products', ['category_id', 'is_active'], { name: 'idx_products_category_active' });
    await queryInterface.sequelize.query(
      'ALTER TABLE products ADD CONSTRAINT chk_products_price CHECK (price > 0)',
    );

    await queryInterface.createTable('shipping_methods', {
      id: { type: Sequelize.SMALLINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(80), allowNull: false },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' });
    await queryInterface.sequelize.query(
      'ALTER TABLE shipping_methods ADD CONSTRAINT chk_shipping_methods_price CHECK (price >= 0)',
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('shipping_methods');
    await queryInterface.dropTable('products');
    await queryInterface.dropTable('categories');
  },
};
