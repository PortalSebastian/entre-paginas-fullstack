import { createAuthService } from './auth-service.js';
import { createCatalogService } from './catalog-service.js';
import { createOrderService } from './order-service.js';
import { createProductService } from './product-service.js';
import { createUserService } from './user-service.js';

export function createServices({ sequelize, models, config }) {
  return {
    auth: createAuthService({
      User: models.User,
      RefreshToken: models.RefreshToken,
      sequelize,
      accessSecret: config.accessSecret,
      refreshSecret: config.refreshSecret,
    }),
    catalog: createCatalogService({
      Product: models.Product,
      Category: models.Category,
      ShippingMethod: models.ShippingMethod,
      sequelize,
    }),
    products: createProductService({ Product: models.Product, Category: models.Category, sequelize }),
    orders: createOrderService({
      sequelize,
      Product: models.Product,
      ShippingMethod: models.ShippingMethod,
      Order: models.Order,
      OrderItem: models.OrderItem,
      OrderStatusHistory: models.OrderStatusHistory,
    }),
    users: createUserService({ User: models.User, sequelize }),
  };
}
