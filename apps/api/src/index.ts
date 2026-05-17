import 'dotenv/config';
import { initSentry } from './config/sentry';
initSentry(); // must run before any other imports that might throw
import { createApp } from './app';
import { env } from './config/env';
import { redis } from './config/redis';
import { scheduleNightlySync } from './jobs/schedulers/nightlySync.scheduler';
import { runGdprCleanup } from './jobs/schedulers/gdprCleanup.scheduler';
// Import processors so Bull workers are registered
import './jobs/processors/sync.processor';
import './jobs/processors/budgetAlert.processor';

// Express's JSON.stringify can't handle BigInt (Prisma uses it for *Cents fields).
// Serialize as Number — safe for amounts up to ~90 trillion EUR in cents.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

const app = createApp();

function startSchedulers(): void {
  const now = new Date();
  // Target 03:00 Europe/Berlin (UTC+1/+2) — approximate with UTC 02:00
  const target = new Date(now);
  target.setUTCHours(2, 0, 0, 0);
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1);

  const msUntilFirst = target.getTime() - now.getTime();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  setTimeout(() => {
    scheduleNightlySync().catch(console.error);
    runGdprCleanup().catch(console.error);
    setInterval(() => {
      scheduleNightlySync().catch(console.error);
      runGdprCleanup().catch(console.error);
    }, MS_PER_DAY);
  }, msUntilFirst);

  console.log(`[scheduler] nightly sync + GDPR cleanup scheduled — first run in ${Math.round(msUntilFirst / 60_000)} min`);
}

async function start() {
  await redis.connect();

  if (env.NODE_ENV !== 'test') {
    startSchedulers();
  }

  app.listen(env.API_PORT, () => {
    console.log(`Finanzapp API running on http://localhost:${env.API_PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
