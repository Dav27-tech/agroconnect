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
  JWT_EXPIRES_IN: z.string().regex(/^[1-9]\d*d$/).default('7d'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
}).superRefine((configuration, context) => {
  if (configuration.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      context.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'A production JWT_SECRET of at least 32 characters is required' });
    }
    if (!process.env.DATABASE_URL) {
      context.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'A production DATABASE_URL is required' });
    }
    if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') {
      context.addIssue({ code: 'custom', path: ['CORS_ORIGIN'], message: 'A specific production CORS_ORIGIN is required' });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuration d\'environnement invalide:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

