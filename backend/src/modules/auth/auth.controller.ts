import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterRequest, LoginRequest } from './auth.types';
import { ResponseHelper } from '../../shared/utils/response.utils';

export class AuthController {
  /**
   * Register new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: RegisterRequest = req.body;

      const result = await AuthService.register({
        email,
        password,
      });

      ResponseHelper.created(res, result, 'User registered successfully');
    } catch (error) {
      console.error('Registration error:', error);

      if (error instanceof Error) {
        if (error.message === 'User with this email already exists') {
          ResponseHelper.conflict(res, error.message);
          return;
        }
      }

      ResponseHelper.internalError(res, 'Internal server error', error);
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      const result = await AuthService.login({ email, password });

      ResponseHelper.success(res, result, 'Login successful');
    } catch (error) {
      console.error('Login error:', error);

      if (error instanceof Error) {
        if (error.message === 'Invalid credentials') {
          ResponseHelper.unauthorized(res, 'Invalid email or password');
          return;
        }
      }

      ResponseHelper.internalError(res, 'Internal server error', error);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;

      ResponseHelper.success(res, user, 'Profile retrieved successfully');
    } catch (error) {
      console.error('Get profile error:', error);
      ResponseHelper.internalError(res, 'Internal server error', error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Check if email is being changed and if it already exists
      if (email) {
        const existingUser = await AuthService.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.userId!) {
          ResponseHelper.conflict(res, 'Email already in use');
          return;
        }
      }

      const updatedUser = await AuthService.updateUser(req.userId!, { email });

      ResponseHelper.success(res, updatedUser, 'Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      ResponseHelper.internalError(res, 'Failed to update profile', error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await AuthService.getUserWithPassword(req.userId!);
      if (!user) {
        ResponseHelper.notFound(res, 'User not found');
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await AuthService.comparePassword(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        ResponseHelper.badRequest(res, 'Current password is incorrect');
        return;
      }

      // Update password
      const hashedNewPassword = await AuthService.hashPassword(newPassword);
      await AuthService.updateUser(req.userId!, { password: hashedNewPassword });

      ResponseHelper.success(res, null, 'Password changed successfully');
    } catch (error) {
      console.error('Change password error:', error);
      ResponseHelper.internalError(res, 'Failed to change password', error);
    }
  }

  /**
   * Logout user - Revoke token and remove session
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        ResponseHelper.badRequest(res, 'Token is required for logout');
        return;
      }

      // Revoke token
      await AuthService.logout(token);

      ResponseHelper.success(res, null, 'Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      ResponseHelper.internalError(res, 'Failed to logout', error);
    }
  }
}
