import { Logger } from '@nestjs/common';

interface EnvVar {
  key: string;
  required: boolean;
  fallback?: string;
}

const ENV_SCHEMA: EnvVar[] = [
  { key: 'DATABASE_URL', required: true },
  { key: 'JWT_SECRET', required: true },
  { key: 'REDIS_URL', required: false, fallback: 'redis://localhost:6379' },
  { key: 'WHATSAPP_TOKEN', required: false },
  { key: 'WHATSAPP_PHONE_NUMBER_ID', required: false },
  { key: 'WHATSAPP_VERIFY_TOKEN', required: false, fallback: 'handy-verify-token' },
  { key: 'FRONTEND_URL', required: false, fallback: 'http://localhost:3001' },
  { key: 'CLOUDINARY_CLOUD_NAME', required: false },
  { key: 'CLOUDINARY_API_KEY', required: false },
  { key: 'CLOUDINARY_API_SECRET', required: false },
  { key: 'PORT', required: false, fallback: '3000' },
];

export function validateEnv(): void {
  const logger = new Logger('EnvValidation');
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_SCHEMA) {
    const value = process.env[envVar.key];

    if (!value && envVar.required) {
      missing.push(envVar.key);
    } else if (!value && envVar.fallback) {
      warnings.push(`${envVar.key} not set — using fallback "${envVar.fallback}"`);
    }
  }

  // Critical security check: JWT_SECRET must not be the default
  const jwtSecret = process.env.JWT_SECRET;
  if (
    jwtSecret === 'handy-dev-secret-change-in-production' &&
    process.env.NODE_ENV === 'production'
  ) {
    missing.push('JWT_SECRET (using insecure default in production!)');
  }

  if (warnings.length > 0) {
    warnings.forEach((w) => logger.warn(`⚠️  ${w}`));
  }

  if (missing.length > 0) {
    const msg = `Missing required env vars: ${missing.join(', ')}`;
    logger.error(`🔴 ${msg}`);

    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    }
  }

  logger.log('✅ Environment variables validated');
}
