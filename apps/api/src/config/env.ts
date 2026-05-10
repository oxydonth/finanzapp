import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  ENCRYPTION_KEY: z.string().length(64),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3001')
    .transform((v) => v.split(',')),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Finanzapp <noreply@finanzapp.de>'),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_REDIRECT_URI: z.string().optional(),
  WISE_CLIENT_ID: z.string().optional(),
  WISE_CLIENT_SECRET: z.string().optional(),
  WISE_REDIRECT_URI: z.string().optional(),
  REVOLUT_CLIENT_ID: z.string().optional(),
  REVOLUT_CLIENT_SECRET: z.string().optional(),
  REVOLUT_REDIRECT_URI: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
