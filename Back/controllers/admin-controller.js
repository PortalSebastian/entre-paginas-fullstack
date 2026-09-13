import { validationError } from '../errors/app-error.js';

function requireBooleanStatus(body) {
  if (typeof body?.isActive !== 'boolean') {
    throw validationError([{ field: 'isActive', message: 'isActive must be boolean.' }]);
  }
  return body.isActive;
}

export function createAdminController(services) {
  return {
    async listProducts(_request, response) {
      response.json({ success: true, data: await services.products.listAll() });
    },
    async createProduct(request, response) {
      response.status(201).json({ success: true, data: await services.products.create(request.body) });
    },
    async updateProduct(request, response) {
      response.json({ success: true, data: await services.products.update(request.params.id, request.body) });
    },
    async updateStock(request, response) {
      response.json({ success: true, data: await services.products.updateStock(request.params.id, request.body.stock) });
    },
    async deactivateProduct(request, response) {
      await services.products.deactivate(request.params.id);
      response.status(204).end();
    },
    async listOrders(request, response) {
      response.json({ success: true, data: await services.orders.listOrders(request.query) });
    },
    async getOrder(request, response) {
      response.json({ success: true, data: await services.orders.getOrder(request.params.id) });
    },
    async updateOrderStatus(request, response) {
      response.json({
        success: true,
        data: await services.orders.updateStatus(request.params.id, request.body.status, request.user),
      });
    },
    async listUsers(_request, response) {
      response.json({ success: true, data: await services.users.list() });
    },
    async getUser(request, response) {
      response.json({ success: true, data: await services.users.get(request.params.id) });
    },
    async updateUserStatus(request, response) {
      response.json({
        success: true,
        data: await services.users.updateStatus(request.params.id, requireBooleanStatus(request.body), request.user),
      });
    },
  };
}
