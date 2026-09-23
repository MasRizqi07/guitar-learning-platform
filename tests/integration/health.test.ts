import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('Health Check Probe Endpoint (/api/health)', () => {
  it('returns HTTP 200 with status ok and does not leak database credentials', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBeUndefined();
    expect(body.uptime).toBeUndefined();
  });
});
