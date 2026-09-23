import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Active database probe: ping PostgreSQL
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'ok',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Database health check probe failed:', error);
    return NextResponse.json(
      {
        status: 'error',
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
