import { NextResponse } from 'next/server';

/**
 * Public Liveness Health Probe
 * Shallow check returning process liveness status.
 * Intentionally omits database hostnames, uptime, environment variables,
 * migration state, provider credentials, and internal service topology.
 */
export async function GET() {
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
}
