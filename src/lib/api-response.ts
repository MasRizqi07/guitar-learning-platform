import { NextResponse } from 'next/server';
import { AppError, ErrorCode } from './errors';
import { ZodError } from 'zod';

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
        details?: unknown;
      };
    };

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR' as ErrorCode,
          message: error.issues[0]?.message || 'Validation failed',
          details: error.flatten(),
        },
      },
      { status: 422 }
    );
  }

  console.error('Unhandled Server Error:', error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR' as ErrorCode,
        message: 'An unexpected error occurred.',
      },
    },
    { status: 500 }
  );
}
