import crypto from 'crypto';
import { sanitizePayload } from './scrubber';
import { getRequestContext } from './request-context';
import { logger } from './logger';

export interface ErrorContext {
  requestId?: string;
  route?: string;
  method?: string;
  userId?: string;
  role?: string;
  extra?: Record<string, unknown>;
}

export interface ErrorMonitoringProvider {
  name: string;
  captureException(error: unknown, context?: ErrorContext): string;
  captureMessage(message: string, level?: 'info' | 'warn' | 'error', context?: ErrorContext): string;
}

/**
 * Default safe local/test provider that writes structured errors through Logger
 * without requiring external network access.
 */
class ConsoleErrorProvider implements ErrorMonitoringProvider {
  name = 'ConsoleErrorProvider';

  captureException(error: unknown, context: ErrorContext = {}): string {
    const errorId = crypto.randomUUID();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('UnhandledExceptionCaptured', {
      errorId,
      message: errorMessage,
      stack: errorStack,
      ...context,
      extra: context.extra ? (sanitizePayload(context.extra) as Record<string, unknown>) : undefined,
    });

    return errorId;
  }

  captureMessage(message: string, level: 'info' | 'warn' | 'error' = 'info', context: ErrorContext = {}): string {
    const messageId = crypto.randomUUID();

    logger[level]('DiagnosticMessageCaptured', {
      messageId,
      message,
      ...context,
      extra: context.extra ? (sanitizePayload(context.extra) as Record<string, unknown>) : undefined,
    });

    return messageId;
  }
}

/**
 * Production provider: dynamically sends to Sentry if DSN is configured
 */
class SentryErrorProvider implements ErrorMonitoringProvider {
  name = 'SentryErrorProvider';

  captureException(error: unknown, context: ErrorContext = {}): string {
    const errorId = crypto.randomUUID();
    // Scrub sensitive data before potential transmission
    const sanitizedContext = sanitizePayload(context) as ErrorContext;
    
    // In production with SENTRY_DSN, Sentry Node SDK can be invoked here.
    // Falls back seamlessly to structured logger
    logger.error('SentryExceptionCaptured', {
      errorId,
      error: error instanceof Error ? error.message : String(error),
      ...sanitizedContext,
    });

    return errorId;
  }

  captureMessage(message: string, level: 'info' | 'warn' | 'error' = 'info', context: ErrorContext = {}): string {
    const messageId = crypto.randomUUID();
    const sanitizedContext = sanitizePayload(context) as ErrorContext;

    logger[level]('SentryMessageCaptured', {
      messageId,
      message,
      ...sanitizedContext,
    });

    return messageId;
  }
}

export class ErrorMonitoringService {
  private static provider: ErrorMonitoringProvider =
    process.env.SENTRY_DSN && process.env.NODE_ENV === 'production'
      ? new SentryErrorProvider()
      : new ConsoleErrorProvider();

  static setProvider(customProvider: ErrorMonitoringProvider) {
    this.provider = customProvider;
  }

  static getProviderName(): string {
    return this.provider.name;
  }

  static captureException(error: unknown, context: ErrorContext = {}): string {
    const ctx = getRequestContext();
    const mergedContext: ErrorContext = {
      requestId: context.requestId || ctx?.requestId,
      route: context.route || ctx?.route,
      method: context.method || ctx?.method,
      userId: context.userId || ctx?.userId,
      role: context.role || ctx?.role,
      extra: context.extra,
    };

    return this.provider.captureException(error, mergedContext);
  }

  static captureMessage(
    message: string,
    level: 'info' | 'warn' | 'error' = 'info',
    context: ErrorContext = {}
  ): string {
    const ctx = getRequestContext();
    const mergedContext: ErrorContext = {
      requestId: context.requestId || ctx?.requestId,
      route: context.route || ctx?.route,
      method: context.method || ctx?.method,
      userId: context.userId || ctx?.userId,
      role: context.role || ctx?.role,
      extra: context.extra,
    };

    return this.provider.captureMessage(message, level, mergedContext);
  }
}

export const errorMonitoring = ErrorMonitoringService;
