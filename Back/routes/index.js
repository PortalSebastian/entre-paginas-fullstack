import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { createAdminController } from '../controllers/admin-controller.js';
import { createAuthController } from '../controllers/auth-controller.js';
import { createCatalogController } from '../controllers/catalog-controller.js';
import { createOrderController } from '../controllers/order-controller.js';
import { AppError } from '../errors/app-error.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { createAuthenticationMiddleware } from '../middleware/auth.js';
import { createCsrfProtection } from '../middleware/csrf.js';
import { requireTrustedOrigin } from '../middleware/origin-check.js';

export function createApiRouter({ services, User, config }) {
  const router = Router();
  const csrf = createCsrfProtection({ csrfSecret: config.csrfSecret, nodeEnv: config.nodeEnv });
  const authController = createAuthController(services.auth, config, csrf);
  const catalogController = createCatalogController(services.catalog);
  const orderController = createOrderController(services.orders);
  const adminController = createAdminController(services);
  const auth = createAuthenticationMiddleware({ User, accessSecret: config.accessSecret });
  const trustedOrigin = requireTrustedOrigin(config.frontendOrigin);
  const limiter = (limit, code, message) => rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_request, _response, next) {
      next(new AppError(429, code, message));
    },
  });
  const authLimiter = limiter(30, 'AUTH_RATE_LIMITED', 'Too many authentication attempts.');
  const orderLimiter = limiter(20, 'ORDER_RATE_LIMITED', 'Too many order attempts.');

  // Proteccion CSRF para todo el router. Ignora por si misma los metodos
  // seguros, de modo que toda mutacion queda cubierta por defecto y ninguna
  // ruta futura puede olvidarse de aplicarla.
  router.use(csrf.protect());

  // Entrega el token al frontend legitimo. Es GET, asi que no exige token.
  router.get('/csrf', csrf.issueToken);

  router.get('/health', (_request, response) => response.json({ success: true, data: { status: 'ok' } }));
  router.get('/categories', asyncHandler(catalogController.listCategories));
  router.get('/shipping-methods', asyncHandler(catalogController.listShippingMethods));
  router.get('/products', asyncHandler(catalogController.listProducts));
  // Debe declararse antes de '/products/:id' o Express interpretaria "search"
  // como un identificador de producto.
  router.get('/products/search', asyncHandler(catalogController.searchProducts));
  router.get('/products/:id', asyncHandler(catalogController.getProduct));

  router.post('/auth/register', authLimiter, asyncHandler(authController.register));
  router.post('/auth/login', authLimiter, asyncHandler(authController.login));
  router.post('/auth/refresh', trustedOrigin, asyncHandler(authController.refresh));
  router.post('/auth/logout', trustedOrigin, asyncHandler(authController.logout));
  router.get('/auth/me', auth.authenticate(), asyncHandler(authController.me));

  router.post('/orders', trustedOrigin, orderLimiter, auth.authenticate({ optional: true }), asyncHandler(orderController.create));
  // Pedidos propios: exigen identidad y la pertenencia se resuelve en el
  // servicio contra el usuario del token. '/orders/mine' va antes que
  // '/orders/:id' para que "mine" no se lea como identificador.
  router.get('/orders/mine', auth.authenticate(), asyncHandler(orderController.listMine));
  router.get('/orders/:id', auth.authenticate(), asyncHandler(orderController.getMine));

  router.use('/admin', auth.authenticate(), auth.requireAdmin);
  router.get('/admin/products', asyncHandler(adminController.listProducts));
  router.post('/admin/products', asyncHandler(adminController.createProduct));
  router.put('/admin/products/:id', asyncHandler(adminController.updateProduct));
  router.patch('/admin/products/:id/stock', asyncHandler(adminController.updateStock));
  router.delete('/admin/products/:id', asyncHandler(adminController.deactivateProduct));
  router.get('/admin/orders', asyncHandler(adminController.listOrders));
  router.get('/admin/orders/:id', asyncHandler(adminController.getOrder));
  router.patch('/admin/orders/:id/status', asyncHandler(adminController.updateOrderStatus));
  router.get('/admin/users', asyncHandler(adminController.listUsers));
  router.get('/admin/users/:id', asyncHandler(adminController.getUser));
  router.patch('/admin/users/:id/status', asyncHandler(adminController.updateUserStatus));

  return router;
}
