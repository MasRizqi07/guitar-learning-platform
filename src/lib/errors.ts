export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'USER_NOT_FOUND'
  | 'SESSION_NOT_FOUND'
  | 'ADMIN_ACCESS_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'INVALID_ACCOUNT_STATUS'
  | 'CANNOT_SUSPEND_SELF'
  | 'ROLE_CHANGE_FORBIDDEN'
  | 'OWNER_REQUIRED'
  | 'LAST_OWNER_PROTECTED'
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
  | 'CONTENT_NOT_FOUND'
  | 'CONTENT_CONFLICT'
  | 'INVALID_CONTENT_STATUS'
  | 'INVALID_STATUS_TRANSITION'
  | 'CONTENT_NOT_PUBLISHABLE'
  | 'CONTENT_ALREADY_ARCHIVED'
  | 'SLUG_ALREADY_EXISTS'
  | 'REVISION_NOT_FOUND'
  | 'REVISION_RESTORE_FAILED'
  | 'QUIZ_INVALID'
  | 'QUESTION_IN_USE'
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

  static badRequest(message = 'Bad request', details?: unknown): AppError {
    return new AppError('BAD_REQUEST', message, 400, details);
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

  static conflict(code: ErrorCode = 'CONTENT_CONFLICT', message = 'Resource was modified by another editor'): AppError {
    return new AppError(code, message, 409);
  }

  static validation(message = 'Validation failed', details?: unknown): AppError {
    return new AppError('VALIDATION_ERROR', message, 422, details);
  }

  static rateLimit(message = 'Too many requests'): AppError {
    return new AppError('RATE_LIMIT_EXCEEDED', message, 429);
  }

  static adminAccessRequired(message = 'Admin access required'): AppError {
    return new AppError('ADMIN_ACCESS_REQUIRED', message, 403);
  }

  static permissionDenied(permission: string, message?: string): AppError {
    return new AppError(
      'PERMISSION_DENIED',
      message || `Access denied. Required permission: ${permission}`,
      403
    );
  }

  static cannotSuspendSelf(message = 'Administrators cannot suspend their own account'): AppError {
    return new AppError('CANNOT_SUSPEND_SELF', message, 400);
  }

  static roleChangeForbidden(message = 'You do not have permission to perform this role transition'): AppError {
    return new AppError('ROLE_CHANGE_FORBIDDEN', message, 403);
  }

  static lastOwnerProtected(message = 'The platform must maintain at least one active OWNER. Cannot demote or suspend the last owner.'): AppError {
    return new AppError('LAST_OWNER_PROTECTED', message, 400);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError('INTERNAL_SERVER_ERROR', message, 500);
  }
}

