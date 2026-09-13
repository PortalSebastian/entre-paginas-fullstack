import { QueryTypes } from 'sequelize';

import { AppError, validationError } from '../errors/app-error.js';

function plain(value) {
  return typeof value.toJSON === 'function' ? value.toJSON() : value;
}

function publicProduct(record) {
  const product = plain(record);
  return {
    id: Number(product.id),
    title: product.title,
    author: product.author,
    price: Number(product.price),
    category: product.category.slug,
    genre: product.genre,
    format: product.format,
    shortDescription: product.shortDescription,
    description: product.description,
    cover: product.coverUrl,
    stock: product.stock,
  };
}

// El termino de busqueda viaja hasta una consulta SQL escrita a mano. Se
// normaliza aqui por calidad del resultado, NO como defensa: la unica defensa
// contra inyeccion es que el valor viaje como parametro ligado, nunca
// concatenado en la sentencia.
const SEARCH_MAX_LENGTH = 100;
const SEARCH_RESULT_LIMIT = 50;

// LIKE trata % y _ como comodines. Escaparlos evita que una busqueda por "100%"
// devuelva el catalogo entero. Es correccion funcional, no seguridad.
// Se usa "!" como caracter de escape en lugar de la barra invertida para no
// depender del modo NO_BACKSLASH_ESCAPES del servidor MySQL.
const LIKE_ESCAPE_CHARACTER = '!';

function escapeLikeWildcards(value) {
  return value
    .replaceAll(LIKE_ESCAPE_CHARACTER, `${LIKE_ESCAPE_CHARACTER}${LIKE_ESCAPE_CHARACTER}`)
    .replaceAll('%', `${LIKE_ESCAPE_CHARACTER}%`)
    .replaceAll('_', `${LIKE_ESCAPE_CHARACTER}_`);
}

function normalizeSearchTerm(rawTerm) {
  const term = typeof rawTerm === 'string' ? rawTerm.trim() : '';
  if (!term) {
    throw validationError([{ field: 'q', message: 'Search term is required.' }]);
  }
  if (term.length > SEARCH_MAX_LENGTH) {
    throw validationError([{ field: 'q', message: `Search term must not exceed ${SEARCH_MAX_LENGTH} characters.` }]);
  }
  return term;
}

function searchRow(row) {
  return {
    id: Number(row.id),
    title: row.title,
    author: row.author,
    price: Number(row.price),
    category: row.category,
    genre: row.genre,
    format: row.format,
    shortDescription: row.short_description,
    description: row.description,
    cover: row.cover_url,
    stock: row.stock,
  };
}

export function createCatalogService({ Product, Category, ShippingMethod, sequelize }) {
  return {
    async listProducts(filters = {}) {
      const categoryInclude = { model: Category, as: 'category', attributes: ['id', 'slug', 'name'] };
      if (filters.category) {
        categoryInclude.where = { slug: String(filters.category).trim().toLowerCase() };
        categoryInclude.required = true;
      }
      const products = await Product.findAll({
        where: { isActive: true },
        include: [categoryInclude],
        order: [['id', 'ASC']],
      });
      return products.map(publicProduct);
    },
    // Busqueda por titulo o autor. Se escribe con SQL explicito, y no con el
    // ORM, para demostrar el patron de consulta parametrizada: la estructura de
    // la sentencia es una constante del programa y los valores viajan aparte,
    // en `replacements`. El motor recibe la sentencia y los datos por canales
    // distintos, de modo que un valor como "' OR '1'='1' --" solo puede
    // comportarse como texto a buscar, jamas como sintaxis SQL.
    async searchProducts(rawTerm) {
      const term = normalizeSearchTerm(rawTerm);
      const pattern = `%${escapeLikeWildcards(term)}%`;
      const rows = await sequelize.query(
        `SELECT p.id, p.title, p.author, p.price, c.slug AS category, p.genre,
                p.format, p.short_description, p.description, p.cover_url, p.stock
           FROM products p
           INNER JOIN categories c ON c.id = p.category_id
          WHERE p.is_active = TRUE
            AND (p.title LIKE ? ESCAPE '!' OR p.author LIKE ? ESCAPE '!')
          ORDER BY p.id ASC
          LIMIT ?`,
        {
          replacements: [pattern, pattern, SEARCH_RESULT_LIMIT],
          type: QueryTypes.SELECT,
        },
      );
      return rows.map(searchRow);
    },
    async getProduct(id) {
      const product = await Product.findOne({
        where: { id, isActive: true },
        include: [{ model: Category, as: 'category', attributes: ['id', 'slug', 'name'] }],
      });
      if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
      return publicProduct(product);
    },
    async listCategories() {
      const categories = await Category.findAll({ order: [['id', 'ASC']] });
      return categories.map((record) => {
        const category = plain(record);
        return { id: Number(category.id), slug: category.slug, name: category.name };
      });
    },
    async listShippingMethods() {
      const methods = await ShippingMethod.findAll({ where: { isActive: true }, order: [['id', 'ASC']] });
      return methods.map((record) => {
        const method = plain(record);
        return { id: Number(method.id), code: method.code, name: method.name, price: Number(method.price) };
      });
    },
  };
}
