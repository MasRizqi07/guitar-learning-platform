export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'USER_NOT_FOUND'
  | 'LESSON_NOT_FOUND'
  | 'LESSON_LOCKED'
  | 'LESSON_ALREADY_COMPLETED'
  | 'LESSON_REQUIREMENT_INCOMPLETE'
  | 'PRACTICE_SESSION_NOT_FOUND'
  | 'PRACTICE_TOO_SHORT'
  | 'PRACTICE_ALREADY_COMPLETED'
  | 'QUIZ_NOT_FOUND'
  | 'QUIZ_ATTEMPT_NOT_FOUND'
  | 'QUIZ_ALREADY_SUBMITTED'
  | 'XP_TRANSACTION_DUPLICATE'
  | 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError('FORBIDDEN', message, 403);
  }

  static notFound(code: ErrorCode = 'INTERNAL_SERVER_ERROR', message = 'Resource not found'): AppError {
    return new AppError(code, message, 404);
  }

  static validation(message = 'Validation failed', details?: unknown): AppError {
    return new AppError('VALIDATION_ERROR', message, 422, details);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError('INTERNAL_SERVER_ERROR', message, 500);
  }
}
