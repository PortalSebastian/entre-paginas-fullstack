'use strict';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      order_number: { type: Sequelize.STRING(32), allowNull: false, unique: true },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      buyer_name: { type: Sequelize.STRING(200), allowNull: false },
      document: { type: Sequelize.STRING(30), allowNull: false },
      email: { type: Sequelize.STRING(254), allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: false },
      address: { type: Sequelize.STRING(255), allowNull: false },
      district: { type: Sequelize.STRING(100), allowNull: false },
      city: { type: Sequelize.STRING(50), allowNull: false },
      address_reference: { type: Sequelize.STRING(255), allowNull: true },
      requested_delivery_date: { type: Sequelize.DATEONLY, allowNull: false },
      shipping_method_id: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: false,
        references: { model: 'shipping_methods', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      shipping_method_name: { type: Sequelize.STRING(80), allowNull: false },
      subtotal: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      shipping_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      total: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      payment_brand: { type: Sequelize.ENUM('visa', 'mastercard', 'amex', 'diners'), allowNull: false },
      payment_last_four: { type: Sequelize.CHAR(4), allowNull: false },
      payment_status: { type: Sequelize.ENUM('SIMULATED_APPROVED'), allowNull: false, defaultValue: 'SIMULATED_APPROVED' },
      status: { type: Sequelize.ENUM(...ORDER_STATUSES), allowNull: false, defaultValue: 'PENDING' },
      stock_restored_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' });
    await queryInterface.addIndex('orders', ['status', 'created_at'], { name: 'idx_orders_status_created' });
    await queryInterface.addIndex('orders', ['user_id'], { name: 'idx_orders_user_id' });
    await queryInterface.sequelize.query(
      'ALTER TABLE orders ADD CONSTRAINT chk_orders_subtotal CHECK (subtotal >= 0), ADD CONSTRAINT chk_orders_shipping_cost CHECK (shipping_cost >= 0), ADD CONSTRAINT chk_orders_total CHECK (total >= 0), ADD CONSTRAINT chk_orders_last_four CHECK (payment_last_four REGEXP \'^[0-9]{4}$\')',
    );

    await queryInterface.createTable('order_items', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      order_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      product_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      product_title: { type: Sequelize.STRING(200), allowNull: false },
      unit_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      quantity: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false },
      line_total: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' });
    await queryInterface.addIndex('order_items', ['order_id'], { name: 'idx_order_items_order_id' });
    await queryInterface.addIndex('order_items', ['product_id'], { name: 'idx_order_items_product_id' });
    await queryInterface.sequelize.query(
      'ALTER TABLE order_items ADD CONSTRAINT chk_order_items_unit_price CHECK (unit_price >= 0), ADD CONSTRAINT chk_order_items_quantity CHECK (quantity BETWEEN 1 AND 10), ADD CONSTRAINT chk_order_items_line_total CHECK (line_total >= 0)',
    );

    await queryInterface.createTable('order_status_history', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      order_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      changed_by_user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      from_status: { type: Sequelize.ENUM(...ORDER_STATUSES), allowNull: true },
      to_status: { type: Sequelize.ENUM(...ORDER_STATUSES), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' });
    await queryInterface.addIndex('order_status_history', ['order_id', 'created_at'], { name: 'idx_order_status_history_order' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_status_history');
    await queryInterface.dropTable('order_items');
    await queryInterface.dropTable('orders');
  },
};
