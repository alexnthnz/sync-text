import { z } from 'zod';
import { 
  emailSchema, 
  passwordSchema, 
  simplePasswordSchema 
} from '../../shared/validation/common.validation';

// Register validation schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

// Login validation schema
export const loginSchema = z.object({
  email: emailSchema,
  password: simplePasswordSchema
});

// Change password validation schema
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z
    .string()
    .min(1, 'Password confirmation is required')
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }
);

// Update profile validation schema
export const updateProfileSchema = z.object({
  email: emailSchema.optional()
}).refine(
  (data) => data.email !== undefined,
  {
    message: 'Email must be provided',
    path: ['email']
  }
);

// Forgot password validation schema
export const forgotPasswordSchema = z.object({
  email: emailSchema
});

// Reset password validation schema
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z
    .string()
    .min(1, 'Password confirmation is required')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }
);

// Export types for TypeScript inference
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>; 