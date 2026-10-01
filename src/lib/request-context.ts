import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

export interface RequestContext {
  requestId: string;
  route?: string;
  method?: string;
  userId?: string;
  role?: string;
}

// Global AsyncLocalStorage store for request tracing across asynchronous execution
const requestStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Validates an incoming request ID or returns a newly generated cryptographically safe UUID
 */
export function normalizeRequestId(incomingHeader?: string | null): string {
  if (!incomingHeader) {
    return crypto.randomUUID();
  }

  const trimmed = incomingHeader.trim();
  // Accept standard UUIDs or alphanumeric identifiers between 8 and 64 characters
  if (/^[a-zA-Z0-9\-_]{8,64}$/.test(trimmed)) {
    return trimmed;
  }

  return crypto.randomUUID();
}

/**
 * Runs a function within an explicit RequestContext
 */
export function runWithRequestContext<R>(context: RequestContext, fn: () => R): R {
  return requestStorage.run(context, fn);
}

/**
 * Retrieves the current request context if available
 */
export function getRequestContext(): RequestContext | undefined {
  return requestStorage.getStore();
}

/**
 * Retrieves the active request ID or generates an ad-hoc fallback
 */
export function getRequestId(): string {
  const store = requestStorage.getStore();
  return store?.requestId || crypto.randomUUID();
}
