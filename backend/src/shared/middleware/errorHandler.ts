import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../utils/response.utils';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = error;

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = 'Database operation failed';
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Log error details (you might want to use a proper logger like Winston)
  console.error(`Error ${statusCode}: ${message}`);
  console.error(error.stack);

  // Send standardized error response based on status code
  const errorDetails = process.env.NODE_ENV === 'development' ? error.stack : undefined;

  switch (statusCode) {
    case 400:
      ResponseHelper.badRequest(res, message, errorDetails);
      break;
    case 401:
      ResponseHelper.unauthorized(res, message);
      break;
    case 403:
      ResponseHelper.forbidden(res, message);
      break;
    case 404:
      ResponseHelper.notFound(res, message);
      break;
    case 409:
      ResponseHelper.conflict(res, message);
      break;
    default:
      ResponseHelper.internalError(res, message, errorDetails);
  }
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}; 