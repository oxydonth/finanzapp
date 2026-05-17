import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';
import { Sentry } from './config/sentry';
import { logger } from './config/logger';

export function createApp() {
  const app = express();

  // Trust Render's proxy so rate limiter sees the real client IP
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
  }));
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(compression());
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== 'test' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Attach a unique request ID to every response for traceability
  app.use((_req, res, next) => {
    res.setHeader('X-Request-Id', randomUUID());
    next();
  });

  // General API rate limit — applied before specific endpoint limits
  const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
  app.use('/api/', generalLimiter);

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
  const mfaLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
  const tanLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });

  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/auth/register', authLimiter);
  app.use('/api/v1/auth/forgot-password', authLimiter);
  app.use('/api/v1/auth/reset-password', authLimiter);
  app.use('/api/v1/auth/refresh', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
  app.use('/api/v1/auth/mfa/complete', mfaLimiter);
  app.use('/api/v1/banks/connections/:id/tan', tanLimiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1', router);
  Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler);

  return app;
}
