import { NextResponse } from 'next/server';
import { AppError, ErrorCode } from './errors';
import { ZodError } from 'zod';
import { getRequestId } from './request-context';
import { ErrorMonitoringService } from './error-monitoring';
import { logger } from './logger';

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        code: ErrorCode;
        message: string;
        requestId?: string;
        details?: unknown;
      };
    };

export function apiSuccess<T>(data: T, status = 200, headers: Record<string, string> = {}) {
  const requestId = getRequestId();
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        'x-request-id': requestId,
        ...headers,
      },
    }
  );
}

export function apiError(error: unknown, customRequestId?: string) {
  const requestId = customRequestId || getRequestId();

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      ErrorMonitoringService.captureException(error, { requestId });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          requestId,
          details: error.details,
        },
      },
      {
        status: error.statusCode,
        headers: {
          'x-request-id': requestId,
        },
      }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR' as ErrorCode,
          message: error.issues[0]?.message || 'Validation failed',
          requestId,
          details: error.flatten(),
        },
      },
      {
        status: 422,
        headers: {
          'x-request-id': requestId,
        },
      }
    );
  }

  // Unhandled / Unexpected 500 internal server errors
  ErrorMonitoringService.captureException(error, { requestId });
  logger.error('UnhandledApiError', {
    requestId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR' as ErrorCode,
        message: 'An unexpected error occurred.',
        requestId,
      },
    },
    {
      status: 500,
      headers: {
        'x-request-id': requestId,
      },
    }
  );
}
