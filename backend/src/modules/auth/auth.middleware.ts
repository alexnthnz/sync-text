import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.types';
import { ResponseHelper } from '../../shared/utils/response.utils';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      ResponseHelper.unauthorized(res, 'Access token is required');
      return;
    }

    const user = await AuthService.validateUser(token);
    
    if (!user) {
      ResponseHelper.unauthorized(res, 'Invalid or expired token');
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    ResponseHelper.unauthorized(res, 'Invalid or expired token');
  }
};

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const user = await AuthService.validateUser(token);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}; 