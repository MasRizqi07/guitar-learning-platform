import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const startTime = Date.now();

export async function GET() {
  try {
    // Active database probe: ping PostgreSQL
    await prisma.$queryRaw`SELECT 1`;

    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    return NextResponse.json(
      {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: uptimeSeconds,
        environment: process.env.NODE_ENV || 'development',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Database connection error',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
