import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters'),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('ShiftOS <no-reply@shiftos.app>'),

  CLIENT_URL: z.string().default('http://localhost:3000'),

  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:');
  console.error(_env.error.format());
  process.exit(1);
}

export const env = {
  ..._env.data,
  PORT: parseInt(_env.data.PORT, 10),
  SMTP_PORT: parseInt(_env.data.SMTP_PORT, 10),
  RATE_LIMIT_WINDOW_MS: parseInt(_env.data.RATE_LIMIT_WINDOW_MS, 10),
  RATE_LIMIT_MAX: parseInt(_env.data.RATE_LIMIT_MAX, 10),
  IS_PRODUCTION: _env.data.NODE_ENV === 'production',
};
