import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateToken } from './auth.middleware';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validateBody } from '../../shared/middleware/validation.middleware';
import { 
  registerSchema, 
  loginSchema, 
  changePasswordSchema, 
  updateProfileSchema 
} from './auth.validation';

const router = Router();

// Public routes
router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);

// Protected routes
router.get('/profile', authenticateToken, requireAuth, AuthController.getProfile);
router.put('/profile', authenticateToken, requireAuth, validateBody(updateProfileSchema), AuthController.updateProfile);
router.put('/change-password', authenticateToken, requireAuth, validateBody(changePasswordSchema), AuthController.changePassword);
router.post('/logout', authenticateToken, requireAuth, AuthController.logout);

export default router; 