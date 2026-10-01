/**
 * Telemetry & Log Scrubber
 * Recursively sanitizes payloads, headers, query parameters, error objects,
 * and metadata to prevent credential, token, and secret leakage.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /auth/i,
  /bearer/i,
  /cookie/i,
  /session/i,
  /apikey/i,
  /api_key/i,
  /access_key/i,
  /private_key/i,
  /credential/i,
  /database_url/i,
  /direct_url/i,
  /databaseurl/i,
  /directurl/i,
  /connection_string/i,
  /internal_notes/i,
  /internalnote/i,
  /supportinternalnote/i,
];

const REDACTED_STRING = '[REDACTED]';

/**
 * Checks whether an object key represents sensitive data
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Sanitizes a string that may contain inline credentials (e.g. database URLs, Bearer tokens)
 */
export function sanitizeString(val: string): string {
  // Redact Bearer tokens
  let result = val.replace(/Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi, 'Bearer [REDACTED]');
  
  // Redact Database connection URLs with user/password
  result = result.replace(/([a-zA-Z+]+:\/\/[^:]+:)([^@]+)(@.+)/g, '$1[REDACTED]$3');

  // Redact JWT-like strings
  result = result.replace(/ey[A-Za-z0-9-_]+\.ey[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '[REDACTED_JWT]');

  return result;
}

/**
 * Recursively scrubs an object, array, or primitive
 */
export function sanitizePayload<T>(input: T, depth = 0, seen = new WeakSet()): T {
  // Prevent infinite loops on deep/circular structures
  if (depth > 8) {
    return '[MAX_DEPTH]' as unknown as T;
  }

  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeString(input) as unknown as T;
  }

  if (typeof input === 'number' || typeof input === 'boolean' || typeof input === 'bigint') {
    return input;
  }

  if (typeof input === 'function') {
    return '[FUNCTION]' as unknown as T;
  }

  if (input instanceof Date) {
    return input;
  }

  if (input instanceof Error) {
    return {
      name: input.name,
      message: sanitizeString(input.message),
      stack: input.stack ? sanitizeString(input.stack) : undefined,
    } as unknown as T;
  }

  if (typeof input === 'object') {
    if (seen.has(input as object)) {
      return '[CIRCULAR]' as unknown as T;
    }
    seen.add(input as object);

    if (Array.isArray(input)) {
      return input.map((item) => sanitizePayload(item, depth + 1, seen)) as unknown as T;
    }

    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (isSensitiveKey(key)) {
        sanitizedObj[key] = REDACTED_STRING;
      } else {
        sanitizedObj[key] = sanitizePayload(value, depth + 1, seen);
      }
    }
    return sanitizedObj as T;
  }

  return input;
}
