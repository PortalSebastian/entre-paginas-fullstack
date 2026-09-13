import { Sequelize } from 'sequelize';

export function createDatabase(databaseConfig) {
  return new Sequelize(databaseConfig.name, databaseConfig.user, databaseConfig.password, {
    host: databaseConfig.host,
    port: databaseConfig.port,
    dialect: 'mysql',
    logging: databaseConfig.logging ? console.log : false,
    define: { freezeTableName: true },
    pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },
    timezone: '+00:00',
  });
}
