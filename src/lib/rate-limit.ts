import crypto from 'crypto';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

// In-memory token bucket fallback for development, CI, and local testing
class MemoryRateLimiter {
  private static store = new Map<string, { count: number; expiresAt: number }>();

  static async limit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const existing = this.store.get(key);

    if (!existing || existing.expiresAt <= now) {
      const expiresAt = now + config.windowSeconds;
      this.store.set(key, { count: 1, expiresAt });
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: expiresAt,
      };
    }

    if (existing.count >= config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        reset: existing.expiresAt,
      };
    }

    existing.count += 1;
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - existing.count,
      reset: existing.expiresAt,
    };
  }

  static reset() {
    this.store.clear();
  }
}

export class RateLimiter {
  private static upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  private static upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  /**
   * Hashes identifier into safe key suffix
   */
  static hashKey(identifier: string): string {
    return crypto.createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex').slice(0, 24);
  }

  /**
   * Evaluates rate limit against Upstash Redis (if configured) or Memory store
   */
  static async check(
    action: string,
    identifier: string,
    config: RateLimitConfig = { maxRequests: 5, windowSeconds: 60 }
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${action}:${this.hashKey(identifier)}`;

    if (this.upstashUrl && this.upstashToken) {
      try {
        // Execute INCR and EXPIRE using Upstash Redis pipeline REST API
        const pipelineUrl = `${this.upstashUrl}/pipeline`;
        const res = await fetch(pipelineUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.upstashToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            ['INCR', key],
            ['EXPIRE', key, config.windowSeconds, 'NX'],
            ['TTL', key],
          ]),
        });

        if (res.ok) {
          const [incrResult, , ttlResult] = await res.json();
          const count = typeof incrResult.result === 'number' ? incrResult.result : 1;
          const ttl = typeof ttlResult.result === 'number' && ttlResult.result > 0 ? ttlResult.result : config.windowSeconds;
          const reset = Math.floor(Date.now() / 1000) + ttl;

          return {
            success: count <= config.maxRequests,
            limit: config.maxRequests,
            remaining: Math.max(0, config.maxRequests - count),
            reset,
          };
        }
      } catch (err) {
        console.warn('[RateLimiter] Upstash Redis check failed, falling back to memory store:', err);
      }
    }

    // Development / Local / Fallback path
    return MemoryRateLimiter.limit(key, config);
  }

  /**
   * Helper to extract client IP from Next.js headers
   */
  static extractClientIp(headers: Headers): string {
    const xff = headers.get('x-forwarded-for');
    if (xff) {
      const firstIp = xff.split(',')[0].trim();
      if (firstIp) return firstIp;
    }
    const realIp = headers.get('x-real-ip');
    if (realIp) return realIp.trim();
    return '127.0.0.1';
  }

  /**
   * Reset store (primarily for unit / integration tests)
   */
  static resetStore() {
    MemoryRateLimiter.reset();
  }
}
