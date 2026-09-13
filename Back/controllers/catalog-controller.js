export function createCatalogController(service) {
  return {
    async listProducts(request, response) {
      response.json({ success: true, data: await service.listProducts(request.query) });
    },
    async searchProducts(request, response) {
      response.json({ success: true, data: await service.searchProducts(request.query.q) });
    },
    async getProduct(request, response) {
      response.json({ success: true, data: await service.getProduct(request.params.id) });
    },
    async listCategories(_request, response) {
      response.json({ success: true, data: await service.listCategories() });
    },
    async listShippingMethods(_request, response) {
      response.json({ success: true, data: await service.listShippingMethods() });
    },
  };
}
