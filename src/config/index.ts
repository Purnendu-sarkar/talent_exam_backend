import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  OTP_EXPIRATION_MINUTES: z.string().default('5'),
  OTP_MAX_ATTEMPTS: z.string().default('3'),
  
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('no-reply@talentexam.in'),
  
  CLIENT_URL: z.string().default('http://localhost:3000'),
  
  SUPER_ADMIN_EMAIL: z.string().email('SUPER_ADMIN_EMAIL must be a valid email'),
  SUPER_ADMIN_NAME: z.string().default('Super Admin'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ FATAL ERROR: Invalid environment variables\n', _env.error.format());
  process.exit(1);
}

const envVars = _env.data;

const config = {
  env: envVars.NODE_ENV,
  port: parseInt(envVars.PORT, 10),
  database_url: envVars.DATABASE_URL,
  jwt: {
    secret: envVars.JWT_SECRET,
    expires_in: envVars.JWT_EXPIRES_IN,
    refresh_secret: envVars.JWT_REFRESH_SECRET || '',
    refresh_expires_in: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  otp: {
    expiration_minutes: parseInt(envVars.OTP_EXPIRATION_MINUTES, 10),
    max_attempts: parseInt(envVars.OTP_MAX_ATTEMPTS, 10),
  },
  email: {
    smtp_host: envVars.SMTP_HOST || '',
    smtp_port: parseInt(envVars.SMTP_PORT, 10),
    smtp_user: envVars.SMTP_USER || '',
    smtp_pass: envVars.SMTP_PASS || '',
    from: envVars.EMAIL_FROM,
  },
  client_url: envVars.CLIENT_URL,
  super_admin: {
    email: envVars.SUPER_ADMIN_EMAIL,
    name: envVars.SUPER_ADMIN_NAME,
  }
};

export default config;
