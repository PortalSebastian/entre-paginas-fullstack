import { validateOrderPayload } from '../validators/payloads.js';

export function createOrderController(service) {
  return {
    async create(request, response) {
      const order = await service.createOrder(validateOrderPayload(request.body), request.user);
      response.status(201).json({ success: true, data: order });
    },
    async listMine(request, response) {
      response.json({ success: true, data: await service.listOwnOrders(request.user) });
    },
    async getMine(request, response) {
      response.json({ success: true, data: await service.getOwnOrder(request.params.id, request.user) });
    },
  };
}
