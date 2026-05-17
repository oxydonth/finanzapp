import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Redis] connection error:', err.message);
  }
});
