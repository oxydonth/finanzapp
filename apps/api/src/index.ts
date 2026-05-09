import 'dotenv/config';
import { createApp } from './app';
import { env } from './config/env';

// Express's JSON.stringify can't handle BigInt (Prisma uses it for *Cents fields).
// Serialize as Number — safe for amounts up to ~90 trillion EUR in cents.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`Finanzapp API running on http://localhost:${env.API_PORT}`);
});
