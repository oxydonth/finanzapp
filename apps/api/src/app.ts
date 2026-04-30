import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(compression());
  app.use(morgan('combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    '/api/v1/auth/login',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts' }),
  );
  app.use(
    '/api/v1/banks/connections/:id/tan',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many TAN attempts' }),
  );

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1', router);
  app.use(errorHandler);

  return app;
}
