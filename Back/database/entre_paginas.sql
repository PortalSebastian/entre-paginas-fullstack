CREATE DATABASE IF NOT EXISTS entre_paginas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE entre_paginas;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  birth_date DATE NOT NULL,
  reading_preference VARCHAR(50) NULL,
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at DATETIME NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('CUSTOMER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_hash (token_hash),
  KEY idx_refresh_tokens_user_id (user_id),
  KEY idx_refresh_tokens_expires_at (expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(30) NOT NULL,
  name VARCHAR(60) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(200) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category_id SMALLINT UNSIGNED NOT NULL,
  genre VARCHAR(100) NOT NULL,
  format VARCHAR(50) NOT NULL,
  short_description VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  cover_url VARCHAR(2048) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_category_active (category_id, is_active),
  CONSTRAINT chk_products_price CHECK (price > 0),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shipping_methods (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(80) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_shipping_methods_code (code),
  CONSTRAINT chk_shipping_methods_price CHECK (price >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number VARCHAR(32) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  buyer_name VARCHAR(200) NOT NULL,
  document VARCHAR(30) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  district VARCHAR(100) NOT NULL,
  city VARCHAR(50) NOT NULL,
  address_reference VARCHAR(255) NULL,
  requested_delivery_date DATE NOT NULL,
  shipping_method_id SMALLINT UNSIGNED NOT NULL,
  shipping_method_name VARCHAR(80) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_brand ENUM('visa', 'mastercard', 'amex', 'diners') NOT NULL,
  payment_last_four CHAR(4) NOT NULL,
  payment_status ENUM('SIMULATED_APPROVED') NOT NULL DEFAULT 'SIMULATED_APPROVED',
  status ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  stock_restored_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_order_number (order_number),
  KEY idx_orders_status_created (status, created_at),
  KEY idx_orders_user_id (user_id),
  CONSTRAINT chk_orders_subtotal CHECK (subtotal >= 0),
  CONSTRAINT chk_orders_shipping_cost CHECK (shipping_cost >= 0),
  CONSTRAINT chk_orders_total CHECK (total >= 0),
  CONSTRAINT chk_orders_last_four CHECK (payment_last_four REGEXP '^[0-9]{4}$'),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_shipping FOREIGN KEY (shipping_method_id) REFERENCES shipping_methods(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_title VARCHAR(200) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_order_id (order_id),
  KEY idx_order_items_product_id (product_id),
  CONSTRAINT chk_order_items_unit_price CHECK (unit_price >= 0),
  CONSTRAINT chk_order_items_quantity CHECK (quantity BETWEEN 1 AND 10),
  CONSTRAINT chk_order_items_line_total CHECK (line_total >= 0),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  changed_by_user_id BIGINT UNSIGNED NULL,
  from_status ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED') NULL,
  to_status ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_status_history_order (order_id, created_at),
  CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_order_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO categories (id, slug, name) VALUES
  (1, 'men', 'Hombres'),
  (2, 'women', 'Mujeres'),
  (3, 'kids', 'Niños')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO shipping_methods (id, code, name, price, is_active) VALUES
  (1, 'standard', 'Envío estándar', 10.00, TRUE),
  (2, 'express', 'Envío expreso', 18.00, TRUE),
  (3, 'pickup', 'Recojo en tienda', 0.00, TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), is_active = VALUES(is_active);

INSERT INTO products
  (id, title, author, price, category_id, genre, format, short_description, description, cover_url, stock, is_active)
VALUES
  (101, 'El viejo y el mar', 'Ernest Hemingway', 42.00, 1, 'Narrativa clásica', 'Tapa blanda', 'Un pescador y un pez enorme, en una lucha sobre el esfuerzo y la dignidad.', 'La lucha de un pescador contra un enorme pez se convierte en una reflexión sobre el esfuerzo y la dignidad.', 'https://covers.openlibrary.org/b/isbn/9780684801223-M.jpg', 20, TRUE),
  (102, '1984', 'George Orwell', 39.90, 1, 'Ciencia ficción', 'Tapa blanda', 'Una distopía sobre el poder, la vigilancia y la libertad.', 'Una novela distópica acerca del poder, la vigilancia y la libertad individual.', 'https://covers.openlibrary.org/b/isbn/9780451524935-M.jpg', 20, TRUE),
  (103, 'Orgullo y prejuicio', 'Jane Austen', 45.00, 2, 'Romance clásico', 'Tapa blanda', 'Las primeras impresiones no siempre dicen la verdad.', 'Elizabeth Bennet y el señor Darcy descubren que las primeras impresiones no siempre dicen la verdad.', 'https://covers.openlibrary.org/b/isbn/9780141439518-M.jpg', 20, TRUE),
  (104, 'Mujercitas', 'Louisa May Alcott', 44.90, 2, 'Novela clásica', 'Tapa blanda', 'Cuatro hermanas crecen y persiguen sus sueños juntas.', 'Cuatro hermanas crecen, persiguen sus sueños y enfrentan juntas los cambios de la vida.', 'https://covers.openlibrary.org/b/isbn/9780147514011-M.jpg', 20, TRUE),
  (105, 'El principito', 'Antoine de Saint-Exupéry', 35.00, 3, 'Literatura infantil', 'Tapa blanda', 'Un viajero pequeño y grandes enseñanzas sobre la amistad.', 'Un pequeño viajero conoce distintos mundos y comparte valiosas enseñanzas sobre la amistad.', 'https://covers.openlibrary.org/b/isbn/9780156012195-M.jpg', 20, TRUE),
  (106, 'Alicia en el país de las maravillas', 'Lewis Carroll', 38.50, 3, 'Fantasía infantil', 'Tapa blanda', 'Un conejo blanco y un mundo fantástico por descubrir.', 'Alicia sigue a un conejo blanco y entra en un mundo fantástico lleno de personajes sorprendentes.', 'https://covers.openlibrary.org/b/isbn/9780141439761-M.jpg', 20, TRUE)
ON DUPLICATE KEY UPDATE
  title = VALUES(title), author = VALUES(author), price = VALUES(price), category_id = VALUES(category_id),
  genre = VALUES(genre), format = VALUES(format), short_description = VALUES(short_description),
  description = VALUES(description), cover_url = VALUES(cover_url);
