import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('Health Check Probe Endpoint (/api/health)', () => {
  it('returns HTTP 200 with database: connected and uptime', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
    expect(typeof body.uptime).toBe('number');
    expect(body.timestamp).toBeDefined();
  });
});
