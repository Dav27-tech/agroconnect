import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env variables
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/agroconnect?schema=public'),
  JWT_SECRET: z.string().min(16).default('super-secret-agroconnect-jwt-key-for-development-2026-drcongo'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DEFAULT_EXCHANGE_RATE: z.coerce.number().positive().default(2850),
  BASE_CURRENCY: z.enum(['USD', 'CDF']).default('USD'),
  TARGET_CURRENCY: z.enum(['USD', 'CDF']).default('CDF'),
  DEFAULT_COMMISSION_RATE_PERCENT: z.coerce.number().min(0).max(100).default(5.0),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuration d\'environnement invalide:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
