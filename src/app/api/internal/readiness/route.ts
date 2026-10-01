import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { env, checkProviderConfig } from '@/lib/env';

/**
 * Deep Operational Readiness Probe
 * Protected endpoint for orchestration platforms, load balancers, and operations.
 * Requires either:
 * 1. x-internal-secret header matching dedicated INTERNAL_OPS_TOKEN (AUTH_SECRET is strictly forbidden)
 * 2. Authenticated ADMIN / OWNER user session
 */
export async function GET(req: NextRequest) {
  const secretHeader = req.headers.get('x-internal-secret');
  const internalOpsToken = process.env.INTERNAL_OPS_TOKEN || env.INTERNAL_OPS_TOKEN;

  let isAuthorized = false;

  // Strict check: only accept dedicated INTERNAL_OPS_TOKEN (AUTH_SECRET must never be accepted)
  if (secretHeader && internalOpsToken && secretHeader === internalOpsToken) {
    isAuthorized = true;
  } else {
    try {
      const user = await getSessionUser();
      if (user && (user.role === 'ADMIN' || user.role === 'OWNER')) {
        isAuthorized = true;
      }
    } catch {
      isAuthorized = false;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Readiness probe requires authorization credentials.',
        },
      },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  // Active database probe: ping PostgreSQL
  let dbStatus = 'healthy';
  let isDbHealthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = 'unreachable';
    isDbHealthy = false;
    logger.error('ReadinessDatabaseProbeFailed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const s3Check = checkProviderConfig('s3');
  const upstashCheck = checkProviderConfig('upstash');

  const checks = {
    database: dbStatus,
    storage: s3Check.configured ? 's3-configured' : 'local-mock-ready',
    rateLimiter: upstashCheck.configured ? 'upstash-redis' : 'memory-store',
    environment: env.NODE_ENV,
  };

  if (!isDbHealthy) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks,
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  return NextResponse.json(
    {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
