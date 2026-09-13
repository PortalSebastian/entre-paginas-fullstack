import test from 'node:test';
import assert from 'node:assert/strict';

import { createCatalogService } from '../../services/catalog-service.js';

test('catalog lists only active products and maps database fields for React', async () => {
  let receivedQuery;
  const service = createCatalogService({
    Product: {
      async findAll(query) {
        receivedQuery = query;
        return [{
          id: 1,
          title: 'Clean Code',
          author: 'Robert C. Martin',
          price: '39.90',
          genre: 'Technology',
          format: 'Paperback',
          shortDescription: 'A guide.',
          description: 'A complete guide.',
          coverUrl: 'https://example.org/cover.jpg',
          stock: 20,
          category: { slug: 'men', name: 'Hombres' },
        }];
      },
    },
    Category: {},
    ShippingMethod: {},
  });

  const products = await service.listProducts({ category: 'men' });

  assert.equal(receivedQuery.where.isActive, true);
  assert.equal(receivedQuery.include[0].where.slug, 'men');
  assert.deepEqual(products[0], {
    id: 1,
    title: 'Clean Code',
    author: 'Robert C. Martin',
    price: 39.9,
    category: 'men',
    genre: 'Technology',
    format: 'Paperback',
    shortDescription: 'A guide.',
    description: 'A complete guide.',
    cover: 'https://example.org/cover.jpg',
    stock: 20,
  });
});

test('catalog rejects an unknown product instead of exposing an inactive record', async () => {
  const service = createCatalogService({
    Product: { async findOne() { return null; } },
    Category: {},
    ShippingMethod: {},
  });

  await assert.rejects(
    () => service.getProduct(999),
    (error) => error.code === 'PRODUCT_NOT_FOUND' && error.status === 404,
  );
});

// --- Prevencion de inyeccion SQL -------------------------------------------
// La consulta de busqueda se escribe con SQL explicito, asi que estas pruebas
// verifican la propiedad que importa: la sentencia enviada al motor es una
// constante del programa y la entrada del usuario viaja siempre por
// `replacements`, nunca dentro del texto de la sentencia.

function searchServiceSpy(rows = []) {
  const calls = [];
  const service = createCatalogService({
    Product: {},
    Category: {},
    ShippingMethod: {},
    sequelize: {
      async query(sql, options) {
        calls.push({ sql, options });
        return rows;
      },
    },
  });
  return { service, calls };
}

test('product search sends the payload as a bound parameter, never as SQL', async () => {
  const { service, calls } = searchServiceSpy();
  const injection = "' OR '1'='1' --";

  await service.searchProducts(injection);

  const { sql, options } = calls[0];
  assert.equal(calls.length, 1);
  // La entrada del atacante no aparece en la sentencia bajo ninguna forma.
  assert.ok(!sql.includes(injection), 'the payload must never reach the statement');
  assert.ok(!sql.includes("OR '1'='1'"), 'the payload must not alter the WHERE clause');
  // La estructura sigue siendo la prevista: dos marcadores de posicion y limite.
  assert.equal(sql.match(/\?/g).length, 3);
  assert.ok(sql.includes('WHERE p.is_active = TRUE'));
  // El valor viaja aparte, como dato, con los comodines de LIKE escapados.
  assert.deepEqual(options.replacements, [`%${injection}%`, `%${injection}%`, 50]);
});

test('product search keeps a legitimate term working', async () => {
  const { service, calls } = searchServiceSpy([{
    id: 7,
    title: 'Clean Code',
    author: 'Robert C. Martin',
    price: '39.90',
    category: 'men',
    genre: 'Technology',
    format: 'Paperback',
    short_description: 'A guide.',
    description: 'A complete guide.',
    cover_url: 'https://example.org/cover.jpg',
    stock: 20,
  }]);

  const results = await service.searchProducts('  Clean  ');

  assert.deepEqual(calls[0].options.replacements.slice(0, 2), ['%Clean%', '%Clean%']);
  assert.equal(results[0].id, 7);
  assert.equal(results[0].price, 39.9);
  assert.equal(results[0].cover, 'https://example.org/cover.jpg');
});

test('product search escapes LIKE wildcards so they cannot widen the match', async () => {
  const { service, calls } = searchServiceSpy();

  await service.searchProducts('100%_off!');

  assert.deepEqual(calls[0].options.replacements[0], '%100!%!_off!!%');
});

test('product search rejects an empty or oversized term with a controlled error', async () => {
  const { service, calls } = searchServiceSpy();

  await assert.rejects(
    () => service.searchProducts('   '),
    (error) => error.code === 'VALIDATION_ERROR' && error.status === 422,
  );
  await assert.rejects(
    () => service.searchProducts('a'.repeat(101)),
    (error) => error.code === 'VALIDATION_ERROR' && error.status === 422,
  );
  assert.equal(calls.length, 0, 'an invalid term must never reach the database');
});
