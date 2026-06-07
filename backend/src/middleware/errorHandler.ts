import { type ErrorHandler } from 'hono';
import { type ContentfulStatusCode as ErrorStatusCode } from 'hono/utils/http-status';

export interface APIError extends Error {
  statusCode?: ErrorStatusCode;
  isOperational?: boolean;
}

export class AppError extends Error implements APIError {
  statusCode: ErrorStatusCode;
  isOperational: boolean;
  override cause?: unknown;

  constructor(message: string, statusCode: ErrorStatusCode = 500, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.cause = cause;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler: ErrorHandler = async (err, c) => {
  let statusCode = (err as APIError).statusCode || (err as { status?: number }).status || 500;
  const isOperational = (err as APIError).isOperational === true;

  // Detect database or Prisma-related errors to avoid exposing structural/connection details to the client
  const isPrismaOrDbError = 
    err.name?.startsWith('Prisma') || 
    err.message?.toLowerCase().includes('prisma') ||
    err.message?.toLowerCase().includes('database') ||
    err.message?.toLowerCase().includes('db[') ||
    err.message?.toLowerCase().includes('findfirst') ||
    err.message?.toLowerCase().includes('findunique') ||
    err.message?.toLowerCase().includes('queryraw') ||
    err.message?.toLowerCase().includes('connection') ||
    err.message?.toLowerCase().includes('postgres') ||
    err.message?.toLowerCase().includes('pooler');

  if (isPrismaOrDbError) {
    statusCode = 500;
  }

  const message = (statusCode >= 500 && !isOperational) || isPrismaOrDbError
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');


  const stack = err.stack || '';
  const origin = stack
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('at ') && !line.includes('node:internal') && !line.includes('node_modules'));

  const cause = (err as { cause?: unknown }).cause;
  const causeInfo = cause instanceof Error
    ? { name: cause.name, message: cause.message, stack: cause.stack }
    : cause;

  // Extract request body safely
  let requestBody: unknown;
  try {
    const contentType = c.req.header('content-type');
    if (contentType?.includes('application/json')) {
      requestBody = await c.req.json().catch(() => undefined);
    }
  } catch {
    requestBody = undefined;
  }

  // Extract user info from context
  const user = c.get('user');
  const userInfo = user ? { id: user.id, email: user.email } : undefined;

  // Log error
  console.error(err);
  console.error('Error context', {
    statusCode,
    message,
    name: err.name,
    requestId: c.get('requestId'),
    origin,
    cause: causeInfo,
    path: c.req.path,
    method: c.req.method,
    requestBody,
    user: userInfo,
  });

  // Send error response
  return c.json({
    error: {
      message,
    },
  }, statusCode as ErrorStatusCode);
};

export const createAuthError = (fallbackMessage: string, error: unknown) => {
  const isProduction = process.env.NODE_ENV === 'production';
  let message = fallbackMessage;

  if (!isProduction && error instanceof Error && error.message) {
    message = error.message;
  }

  return new AppError(message, 500, error);
};

export const resolveApiErrorStatus = (error: unknown): ErrorStatusCode => {
  const err = error as any;
  const rawStatus = err?.statusCode ?? err?.status;

  if (typeof rawStatus === 'number') {
    return rawStatus as ErrorStatusCode;
  }

  if (typeof rawStatus === 'string') {
    const statusMap: Record<string, ErrorStatusCode> = {
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      UNPROCESSABLE_ENTITY: 422,
      TOO_MANY_REQUESTS: 429,
      INTERNAL_SERVER_ERROR: 500,
    };

    return statusMap[rawStatus] ?? 500;
  }

  return 500;
};