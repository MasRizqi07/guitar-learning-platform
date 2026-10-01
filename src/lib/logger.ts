import crypto from 'crypto';
import { sanitizePayload } from './scrubber';
import { getRequestContext } from './request-context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  requestId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  userId?: string;
  role?: string;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  requestId: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  userIdHash?: string;
  role?: string;
  release: string;
  environment: string;
  metadata?: Record<string, unknown>;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getActiveLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (envLevel && LOG_LEVEL_PRIORITY[envLevel] !== undefined) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function hashUserId(userId?: string): string | undefined {
  if (!userId) return undefined;
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

export class Logger {
  private static release =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_SHA ||
    'v2.0.0-rc.1';

  private static environment = process.env.NODE_ENV || 'development';

  private static shouldLog(level: LogLevel): boolean {
    const minLevel = getActiveLogLevel();
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
  }

  private static formatLog(level: LogLevel, event: string, meta: LogMetadata = {}): StructuredLogEntry {
    const ctx = getRequestContext();
    const requestId = meta.requestId || ctx?.requestId || crypto.randomUUID();
    const route = meta.route || ctx?.route;
    const method = meta.method || ctx?.method;
    const userId = meta.userId || ctx?.userId;
    const role = meta.role || ctx?.role;

    const status = meta.status;
    const durationMs = meta.durationMs;
    const customMeta: Record<string, unknown> = { ...meta };
    delete customMeta.requestId;
    delete customMeta.route;
    delete customMeta.method;
    delete customMeta.userId;
    delete customMeta.role;
    delete customMeta.status;
    delete customMeta.durationMs;

    const sanitizedCustomMeta = sanitizePayload(customMeta) as Record<string, unknown>;

    return {
      timestamp: new Date().toISOString(),
      level,
      event,
      requestId,
      route,
      method,
      status,
      durationMs,
      userIdHash: hashUserId(userId),
      role,
      release: this.release,
      environment: this.environment,
      metadata: Object.keys(sanitizedCustomMeta).length > 0 ? sanitizedCustomMeta : undefined,
    };
  }

  private static output(entry: StructuredLogEntry) {
    const serialized = JSON.stringify(entry);
    switch (entry.level) {
      case 'error':
        console.error(serialized);
        break;
      case 'warn':
        console.warn(serialized);
        break;
      case 'debug':
        console.debug(serialized);
        break;
      case 'info':
        console.info(serialized);
        break;
      default:
        console.log(serialized);
        break;
    }
  }

  static debug(event: string, meta?: LogMetadata) {
    if (this.shouldLog('debug')) {
      this.output(this.formatLog('debug', event, meta));
    }
  }

  static info(event: string, meta?: LogMetadata) {
    if (this.shouldLog('info')) {
      this.output(this.formatLog('info', event, meta));
    }
  }

  static warn(event: string, meta?: LogMetadata) {
    if (this.shouldLog('warn')) {
      this.output(this.formatLog('warn', event, meta));
    }
  }

  static error(event: string, meta?: LogMetadata) {
    if (this.shouldLog('error')) {
      this.output(this.formatLog('error', event, meta));
    }
  }
}

export const logger = Logger;
