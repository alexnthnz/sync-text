import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../utils/response.utils';

// Extend Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      userId?: string; // Optional for non-protected routes
    }
  }
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

interface ProtectedRequest extends Request {
  user: {
    id: string;
    email: string;
    username: string;
  };
  userId: string; // Guaranteed to be present after requireAuth middleware
}

/**
 * Middleware for protected routes that require authentication
 * Assumes authenticateToken middleware has already run
 */
export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.user?.id;

  if (!userId) {
    ResponseHelper.unauthorized(res, 'Unauthorized');
    return;
  }

  // Add convenience property for direct access to userId
  req.userId = userId;
  
  next();
};

// Export the type for use in controllers
export { ProtectedRequest }; 