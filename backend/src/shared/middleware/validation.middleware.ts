import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ResponseHelper } from '../utils/response.utils';

export const validateBody = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map(err => ({
          field: err.path.join('.') || 'unknown',
          message: err.message,
          code: err.code
        }));
        
        // Create clean validation error response
        const response = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errorDetails
          },
          message: 'Validation failed',
          status_code: 422
        };

        res.status(422).json(response);
        return;
      }
      
      ResponseHelper.internalError(res, 'Validation error', error);
    }
  };
};

export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map(err => ({
          field: err.path.join('.') || 'unknown',
          message: err.message,
          code: err.code
        }));
        
        // Create clean validation error response
        const response = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query validation failed',
            details: errorDetails
          },
          message: 'Query validation failed',
          status_code: 422
        };

        res.status(422).json(response);
        return;
      }
      
      ResponseHelper.internalError(res, 'Query validation error', error);
    }
  };
};

export const validateParams = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map(err => ({
          field: err.path.join('.') || 'unknown',
          message: err.message,
          code: err.code
        }));
        
        // Create clean validation error response
        const response = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameter validation failed',
            details: errorDetails
          },
          message: 'Parameter validation failed',
          status_code: 422
        };

        res.status(422).json(response);
        return;
      }
      
      ResponseHelper.internalError(res, 'Params validation error', error);
    }
  };
};

// Combine multiple validations
export const validate = <TBody = any, TQuery = any, TParams = any>(options: {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}) => {
  return [
    ...(options.params ? [validateParams(options.params)] : []),
    ...(options.query ? [validateQuery(options.query)] : []),
    ...(options.body ? [validateBody(options.body)] : [])
  ];
}; 