/**
 * Structured application error classes.
 * All errors map to HTTP status codes with consistent JSON response format.
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      'NOT_FOUND',
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      404,
    );
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, 409, details);
    this.name = 'ConflictError';
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super('BUSINESS_RULE_VIOLATION', message, 422, details);
    this.name = 'BusinessRuleError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: unknown) {
    super(`EXTERNAL_SERVICE_ERROR:${service.toUpperCase()}`, message, 502, details);
    this.name = 'ExternalServiceError';
  }
}

/** Build a standardised error response body */
export function buildErrorResponse(error: AppError) {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}

/** Build a standardised success response body */
export function buildSuccessResponse<T>(
  data: T,
  meta?: {
    total?: number;
    limit?: number;
    nextCursor?: string | null;
    hasMore?: boolean;
  },
) {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
}
