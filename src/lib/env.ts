import { z } from 'zod';

const envSchema = z.object({
  // Core Database & Security
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
  AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Release Identification
  GIT_SHA: z.string().optional(),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),

  // Internal Operations & Readiness Probes
  INTERNAL_OPS_TOKEN: z.string().optional(),

  // Optional External Providers (Validated on activation)
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_URL: process.env.AUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  GIT_SHA: process.env.GIT_SHA,
  VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  INTERNAL_OPS_TOKEN: process.env.INTERNAL_OPS_TOKEN,
  SENTRY_DSN: process.env.SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
});

export type ProviderName = 's3' | 'upstash' | 'resend' | 'posthog' | 'sentry';

export function checkProviderConfig(provider: ProviderName): { configured: boolean; missing: string[] } {
  const missing: string[] = [];

  switch (provider) {
    case 's3':
      if (!env.AWS_ACCESS_KEY_ID) missing.push('AWS_ACCESS_KEY_ID');
      if (!env.AWS_SECRET_ACCESS_KEY) missing.push('AWS_SECRET_ACCESS_KEY');
      if (!env.AWS_REGION) missing.push('AWS_REGION');
      if (!env.AWS_S3_BUCKET) missing.push('AWS_S3_BUCKET');
      break;
    case 'upstash':
      if (!env.UPSTASH_REDIS_REST_URL) missing.push('UPSTASH_REDIS_REST_URL');
      if (!env.UPSTASH_REDIS_REST_TOKEN) missing.push('UPSTASH_REDIS_REST_TOKEN');
      break;
    case 'resend':
      if (!env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
      break;
    case 'posthog':
      if (!env.POSTHOG_API_KEY && !env.NEXT_PUBLIC_POSTHOG_KEY) missing.push('POSTHOG_API_KEY');
      break;
    case 'sentry':
      if (!env.SENTRY_DSN && !env.NEXT_PUBLIC_SENTRY_DSN) missing.push('SENTRY_DSN');
      break;
  }

  return {
    configured: missing.length === 0,
    missing,
  };
}
