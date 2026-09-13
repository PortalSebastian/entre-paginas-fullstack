import { createApp } from './app.js';
import { createDatabase } from './config/database.js';
import { createModels } from './models/index.js';
import { createServices } from './services/index.js';

export function createRuntime(config) {
  const sequelize = createDatabase(config.database);
  const models = createModels(sequelize);
  const services = createServices({ sequelize, models, config });
  const app = createApp({ services, User: models.User, config });
  return { app, sequelize, models, services };
}
