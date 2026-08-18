import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  database_url: process.env.DATABASE_URL as string,
  jwt: {
    secret: process.env.JWT_SECRET as string,
    expires_in: process.env.JWT_EXPIRES_IN || '1d',
    refresh_secret: process.env.JWT_REFRESH_SECRET as string,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  otp: {
    expiration_minutes: parseInt(process.env.OTP_EXPIRATION_MINUTES || '5', 10),
    max_attempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  },
  email: {
    smtp_host: process.env.SMTP_HOST,
    smtp_port: parseInt(process.env.SMTP_PORT || '587', 10),
    smtp_user: process.env.SMTP_USER,
    smtp_pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'no-reply@talentexam.in',
  },
  client_url: process.env.CLIENT_URL || 'http://localhost:3000',
};
