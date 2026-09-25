import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createApiRouter } from './routes/index.js';

export function createApp({ services, User, config }) {
  const app = express();
  app.disable('x-powered-by');
  // En produccion la API corre detras de Nginx en la misma maquina (un solo
  // salto). Confiar en ese salto hace que req.ip salga de X-Forwarded-For
  // (rate limit por cliente, no global) y req.secure de X-Forwarded-Proto.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.frontendOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api/v1', createApiRouter({ services, User, config }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
