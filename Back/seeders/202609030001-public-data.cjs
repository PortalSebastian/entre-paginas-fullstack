'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('categories', [
      { id: 1, slug: 'men', name: 'Hombres', created_at: now, updated_at: now },
      { id: 2, slug: 'women', name: 'Mujeres', created_at: now, updated_at: now },
      { id: 3, slug: 'kids', name: 'Niños', created_at: now, updated_at: now },
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('shipping_methods', [
      { id: 1, code: 'standard', name: 'Envío estándar', price: 10, is_active: true, created_at: now, updated_at: now },
      { id: 2, code: 'express', name: 'Envío expreso', price: 18, is_active: true, created_at: now, updated_at: now },
      { id: 3, code: 'pickup', name: 'Recojo en tienda', price: 0, is_active: true, created_at: now, updated_at: now },
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('products', [
      {
        id: 101, title: 'El viejo y el mar', author: 'Ernest Hemingway', price: 42,
        category_id: 1, genre: 'Narrativa clásica', format: 'Tapa blanda',
        short_description: 'Un pescador y un pez enorme, en una lucha sobre el esfuerzo y la dignidad.',
        description: 'La lucha de un pescador contra un enorme pez se convierte en una reflexión sobre el esfuerzo y la dignidad.',
        cover_url: 'https://covers.openlibrary.org/b/isbn/9780684801223-M.jpg', stock: 20, is_active: true, created_at: now, updated_at: now,
      },
      {
        id: 102, title: '1984', author: 'George Orwell', price: 39.9,
        category_id: 1, genre: 'Ciencia ficción', format: 'Tapa blanda',
        short_description: 'Una distopía sobre el poder, la vigilancia y la libertad.',
        description: 'Una novela distópica acerca del poder, la vigilancia y la libertad individual.',
        cover_url: 'https://covers.openlibrary.org/b/isbn/9780451524935-M.jpg', stock: 20, is_active: true, created_at: now, updated_at: now,
      },
      {
        id: 103, title: 'Orgullo y prejuicio', author: 'Jane Austen', price: 45,
        category_id: 2, genre: 'Romance clásico', format: 'Tapa blanda',
        short_description: 'Las primeras impresiones no siempre dicen la verdad.',
        description: 'Elizabeth Bennet y el señor Darcy descubren que las primeras impresiones no siempre dicen la verdad.',
        cover_url: 'https://covers.openlibrary.org/b/isbn/9780141439518-M.jpg', stock: 20, is_active: true, created_at: now, updated_at: now,
      },
      {
        id: 104, title: 'Mujercitas', author: 'Louisa May Alcott', price: 44.9,
        category_id: 2, genre: 'Novela clásica', format: 'Tapa blanda',
        short_description: 'Cuatro hermanas crecen y persiguen sus sueños juntas.',
        description: 'Cuatro hermanas crecen, persiguen sus sueños y enfrentan juntas los cambios de la vida.',
        cover_url: 'https://covers.openlibrary.org/b/isbn/9780147514011-M.jpg', stock: 20, is_active: true, created_at: now, updated_at: now,
      },
      {
        id: 105, title: 'El principito', author: 'Antoine de Saint-Exupéry', price: 35,
        category_id: 3, genre: 'Literatura infantil', format: 'Tapa blanda',
        short_description: 'Un viajero pequeño y grandes enseñanzas sobre la amistad.',
        description: 'Un pequeño viajero conoce distintos mundos y comparte valiosas enseñanzas sobre la amistad.',
        cover_url: 'https://covers.openlibrary.org/b/isbn/9780156012195-M.jpg', stock: 20, is_active: true, created_at: now, updated_at: now,
      },
      {
        id: 106, title: 'Alicia en el país de las maravillas', author: 'Lewis Carroll', price: 38.5,
        category_id: 3, genre: 'Fantasía infantil', format: 'Tapa blanda',
        short_description: 'Un conejo blanco y un mundo fantástico por descubrir.',
        description: 'Alicia sigue a un conejo blanco y entra en un mundo fantástico lleno de personajes sorprendentes.',
        cover_url: 'https://covers.openlibrary.org/b/isbn/9780141439761-M.jpg', stock: 20, is_active: true, created_at: now, updated_at: now,
      },
    ], { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('products', { id: [101, 102, 103, 104, 105, 106] });
    await queryInterface.bulkDelete('shipping_methods', { id: [1, 2, 3] });
    await queryInterface.bulkDelete('categories', { id: [1, 2, 3] });
  },
};
