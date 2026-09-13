require('dotenv').config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

function database(suffix = '') {
  return {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: `${process.env.DB_NAME || 'entre_paginas'}${suffix}`,
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    charset: 'utf8mb4',
    migrationStorage: 'sequelize',
    seederStorage: 'sequelize',
  };
}

module.exports = {
  development: database(),
  test: database(),
  production: database(),
};
