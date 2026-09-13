import 'dotenv/config';

import { loadConfig } from './config/env.js';
import { createRuntime } from './runtime.js';

const config = loadConfig();
const runtime = createRuntime(config);

try {
  await runtime.sequelize.authenticate();
  const server = runtime.app.listen(config.port, () => {
    console.log(`Entre Paginas API listening on http://localhost:${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received. Closing the API.`);
    server.close(async () => {
      await runtime.sequelize.close();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  console.error('The API could not start:', error.message);
  await runtime.sequelize.close();
  process.exitCode = 1;
}
