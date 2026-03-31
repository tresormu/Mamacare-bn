import dotenv from 'dotenv';
dotenv.config();

const required = [
  'MONGODB_URI',
  'JWT_SECRET',
  'ALLOWED_ORIGINS',
  'FLW_SECRET_KEY',
  'FLW_SECRET_HASH',
  'FLW_REDIRECT_URL',
  'MAMACARE',
] as const;
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
export const env = process.env.NODE_ENV || 'development';
export const port = Number(process.env.PORT || 4000);
export const mongoUri = process.env.MONGODB_URI as string;
export const jwtSecret = process.env.JWT_SECRET as string;
export const allowedOrigins = process.env.ALLOWED_ORIGINS!.split(',').map(o => o.trim());
