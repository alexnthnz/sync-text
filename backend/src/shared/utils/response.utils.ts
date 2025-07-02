import { Response } from 'express';
import { 
  ApiResponse, 
  SuccessResponse, 
  ErrorResponse, 
  ResponseMeta, 
  ResponseError,
  PaginationParams 
} from '../types/response.types';
import { isDevelopment } from '../../config';

export class ResponseHelper {
  /**
   * Send successful response
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Operation successful',
    statusCode: number = 200,
    meta?: Partial<ResponseMeta>
  ): void {
    const response: SuccessResponse<T> = {
      data,
      message,
      status_code: statusCode,
      ...(meta && Object.keys(meta).length > 0 && { meta })
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    details?: any,
    field?: string
  ): void {
    const error: ResponseError = {
      code: errorCode,
      message,
      details,
      field,
      ...(isDevelopment() && details?.stack && { stack: details.stack })
    };

    const response: ErrorResponse = {
      error,
      message,
      status_code: statusCode
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    pagination: PaginationParams,
    message: string = 'Data retrieved successfully'
  ): void {
    const { page = 1, limit = 10 } = pagination;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const meta: ResponseMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    };

    const response: SuccessResponse<T[]> = {
      data,
      message,
      status_code: 200,
      meta
    };

    res.status(200).json(response);
  }

  /**
   * Send created response
   */
  static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
  ): void {
    this.success(res, data, message, 201);
  }

  /**
   * Send no content response
   */
  static noContent(res: Response, message: string = 'Operation completed successfully'): void {
    const response: ApiResponse = {
      message,
      status_code: 204
    };

    res.status(204).json(response);
  }

  /**
   * Common error responses
   */
  static badRequest(res: Response, message: string = 'Bad request', details?: any, field?: string): void {
    this.error(res, message, 400, 'BAD_REQUEST', details, field);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): void {
    this.error(res, message, 401, 'UNAUTHORIZED');
  }

  static forbidden(res: Response, message: string = 'Forbidden'): void {
    this.error(res, message, 403, 'FORBIDDEN');
  }

  static notFound(res: Response, message: string = 'Resource not found'): void {
    this.error(res, message, 404, 'NOT_FOUND');
  }

  static conflict(res: Response, message: string = 'Resource already exists'): void {
    this.error(res, message, 409, 'CONFLICT');
  }

  static validationError(res: Response, message: string = 'Validation failed', field?: string, details?: any): void {
    this.error(res, message, 422, 'VALIDATION_ERROR', details, field);
  }

  static internalError(res: Response, message: string = 'Internal server error', details?: any): void {
    this.error(res, message, 500, 'INTERNAL_ERROR', details);
  }
} 