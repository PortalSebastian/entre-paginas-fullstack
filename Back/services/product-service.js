import { AppError, validationError } from '../errors/app-error.js';

function productDetails(product) {
  const value = typeof product.toJSON === 'function' ? product.toJSON() : product;
  return {
    id: value.id,
    title: value.title,
    author: value.author,
    price: Number(value.price),
    categoryId: value.categoryId,
    category: value.category?.slug ?? value.Category?.slug,
    genre: value.genre,
    format: value.format,
    shortDescription: value.shortDescription,
    description: value.description,
    coverUrl: value.coverUrl,
    stock: value.stock,
    isActive: value.isActive,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function normalizeProduct(payload = {}, { partial = false } = {}) {
  const values = {};
  const details = [];
  const requiredText = ['title', 'author', 'genre', 'format', 'shortDescription', 'description', 'coverUrl'];

  for (const field of requiredText) {
    if (field in payload || !partial) {
      values[field] = typeof payload[field] === 'string' ? payload[field].trim() : '';
      if (!values[field]) details.push({ field, message: `${field} is required.` });
    }
  }
  if ('price' in payload || !partial) {
    values.price = Number(payload.price);
    if (!Number.isFinite(values.price) || values.price <= 0) details.push({ field: 'price', message: 'Price must be positive.' });
  }
  if ('categoryId' in payload || !partial) {
    values.categoryId = Number(payload.categoryId);
    if (!Number.isSafeInteger(values.categoryId) || values.categoryId <= 0) details.push({ field: 'categoryId', message: 'Select a valid category.' });
  }
  if ('stock' in payload || !partial) {
    values.stock = Number(payload.stock);
    if (!Number.isSafeInteger(values.stock) || values.stock < 0) details.push({ field: 'stock', message: 'Stock must be a non-negative integer.' });
  }
  if ('isActive' in payload) {
    values.isActive = payload.isActive;
    if (typeof values.isActive !== 'boolean') details.push({ field: 'isActive', message: 'isActive must be boolean.' });
  }
  if (values.coverUrl) {
    try {
      const url = new URL(values.coverUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      details.push({ field: 'coverUrl', message: 'Cover URL must use HTTP or HTTPS.' });
    }
  }
  if (details.length) throw validationError(details);
  return values;
}

export function createProductService({ Product, Category, sequelize }) {
  async function findProduct(id, options = {}) {
    const product = await Product.findByPk(id, {
      include: [{ model: Category, as: 'category' }],
      ...options,
    });
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    return product;
  }

  async function assertCategory(categoryId, options = {}) {
    const category = await Category.findByPk(categoryId, options);
    if (!category) throw new AppError(422, 'INVALID_CATEGORY', 'The category does not exist.');
  }

  return {
    async listAll() {
      const products = await Product.findAll({ include: [{ model: Category, as: 'category' }], order: [['id', 'ASC']] });
      return products.map(productDetails);
    },
    async create(payload) {
      const values = normalizeProduct(payload);
      await assertCategory(values.categoryId);
      return productDetails(await Product.create({ ...values, isActive: values.isActive ?? true }));
    },
    async update(id, payload) {
      const values = normalizeProduct(payload, { partial: true });
      return sequelize.transaction(async (transaction) => {
        const product = await findProduct(id, { transaction, lock: transaction.LOCK.UPDATE });
        if (values.categoryId) await assertCategory(values.categoryId, { transaction });
        await product.update(values, { transaction });
        return productDetails(product);
      });
    },
    async updateStock(id, rawStock) {
      const stock = Number(rawStock);
      if (!Number.isSafeInteger(stock) || stock < 0) {
        throw validationError([{ field: 'stock', message: 'Stock must be a non-negative integer.' }]);
      }
      return sequelize.transaction(async (transaction) => {
        const product = await findProduct(id, { transaction, lock: transaction.LOCK.UPDATE });
        await product.update({ stock }, { transaction });
        return productDetails(product);
      });
    },
    async deactivate(id) {
      await sequelize.transaction(async (transaction) => {
        const product = await findProduct(id, { transaction, lock: transaction.LOCK.UPDATE });
        await product.update({ isActive: false }, { transaction });
      });
    },
  };
}
