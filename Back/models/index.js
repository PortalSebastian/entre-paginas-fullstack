import { DataTypes } from 'sequelize';

const baseOptions = { underscored: true, timestamps: true };

export function createModels(sequelize) {
  const User = sequelize.define('User', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    firstName: { type: DataTypes.STRING(100), allowNull: false },
    lastName: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    birthDate: { type: DataTypes.DATEONLY, allowNull: false },
    readingPreference: { type: DataTypes.STRING(50), allowNull: true },
    newsletterOptIn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    termsAcceptedAt: { type: DataTypes.DATE, allowNull: false },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('CUSTOMER', 'ADMIN'), allowNull: false, defaultValue: 'CUSTOMER' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { ...baseOptions, tableName: 'users', defaultScope: { attributes: { exclude: ['passwordHash'] } }, scopes: { withPassword: {} } });

  const RefreshToken = sequelize.define('RefreshToken', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
  }, { ...baseOptions, tableName: 'refresh_tokens', updatedAt: false });

  const Category = sequelize.define('Category', {
    id: { type: DataTypes.SMALLINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(60), allowNull: false },
  }, { ...baseOptions, tableName: 'categories' });

  const Product = sequelize.define('Product', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    author: { type: DataTypes.STRING(200), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
    categoryId: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    genre: { type: DataTypes.STRING(100), allowNull: false },
    format: { type: DataTypes.STRING(50), allowNull: false },
    shortDescription: { type: DataTypes.STRING(500), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    coverUrl: { type: DataTypes.STRING(2048), allowNull: false },
    stock: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { ...baseOptions, tableName: 'products' });

  const ShippingMethod = sequelize.define('ShippingMethod', {
    id: { type: DataTypes.SMALLINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { ...baseOptions, tableName: 'shipping_methods' });

  const Order = sequelize.define('Order', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderNumber: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    buyerName: { type: DataTypes.STRING(200), allowNull: false },
    document: { type: DataTypes.STRING(30), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    address: { type: DataTypes.STRING(255), allowNull: false },
    district: { type: DataTypes.STRING(100), allowNull: false },
    city: { type: DataTypes.STRING(50), allowNull: false },
    addressReference: { type: DataTypes.STRING(255), allowNull: true },
    requestedDeliveryDate: { type: DataTypes.DATEONLY, allowNull: false },
    shippingMethodId: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    shippingMethodName: { type: DataTypes.STRING(80), allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    shippingCost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    paymentBrand: { type: DataTypes.ENUM('visa', 'mastercard', 'amex', 'diners'), allowNull: false },
    paymentLastFour: { type: DataTypes.CHAR(4), allowNull: false },
    paymentStatus: { type: DataTypes.ENUM('SIMULATED_APPROVED'), allowNull: false, defaultValue: 'SIMULATED_APPROVED' },
    status: {
      type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    stockRestoredAt: { type: DataTypes.DATE, allowNull: true },
  }, { ...baseOptions, tableName: 'orders' });

  const OrderItem = sequelize.define('OrderItem', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    productTitle: { type: DataTypes.STRING(200), allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    quantity: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, validate: { min: 1, max: 10 } },
    lineTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
  }, { ...baseOptions, tableName: 'order_items', updatedAt: false });

  const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    changedByUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    fromStatus: {
      type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'),
      allowNull: true,
    },
    toStatus: {
      type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'),
      allowNull: false,
    },
  }, { ...baseOptions, tableName: 'order_status_history', updatedAt: false });

  User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
  RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
  Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
  Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
  ShippingMethod.hasMany(Order, { foreignKey: 'shippingMethodId', as: 'orders' });
  Order.belongsTo(ShippingMethod, { foreignKey: 'shippingMethodId', as: 'shippingMethod' });
  Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
  OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
  OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  Order.hasMany(OrderStatusHistory, { foreignKey: 'orderId', as: 'statusHistory' });
  OrderStatusHistory.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  User.hasMany(OrderStatusHistory, { foreignKey: 'changedByUserId', as: 'orderStatusChanges' });
  OrderStatusHistory.belongsTo(User, { foreignKey: 'changedByUserId', as: 'changedBy' });

  return { User, RefreshToken, Category, Product, ShippingMethod, Order, OrderItem, OrderStatusHistory };
}
