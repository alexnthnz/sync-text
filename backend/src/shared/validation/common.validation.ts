import { z } from 'zod';

// Common field validation schemas
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please provide a valid email address')
  .toLowerCase()
  .trim();

export const nameSchema = z
  .string()
  .min(1, 'Name cannot be empty')
  .max(100, 'Name cannot exceed 100 characters')
  .trim()
  .optional();

export const requiredNameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name cannot exceed 100 characters')
  .trim();

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters long')
  .max(100, 'Password cannot exceed 100 characters')
  .refine(
    (password: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password),
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

export const simplePasswordSchema = z
  .string()
  .min(1, 'Password is required');

// ID validation schemas
export const uuidSchema = z
  .string()
  .min(1, 'ID is required')
  .uuid('Invalid ID format');

// Common pagination schema
export const paginationSchema = z.object({
  page: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .refine((val: number) => !isNaN(val) && val > 0, 'Page must be a positive number')
    .default('1'),
  limit: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .refine((val: number) => !isNaN(val) && val > 0 && val <= 100, 'Limit must be between 1 and 100')
    .default('10'),
  search: z
    .string()
    .min(1, 'Search term cannot be empty')
    .max(100, 'Search term cannot exceed 100 characters')
    .trim()
    .optional()
});

// Common sort schema
export const sortSchema = z.object({
  sortBy: z
    .string()
    .min(1, 'Sort field is required')
    .default('createdAt'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc')
});

// Date validation schemas
export const dateStringSchema = z
  .string()
  .datetime('Invalid date format');

export const optionalDateStringSchema = z
  .string()
  .datetime('Invalid date format')
  .optional();

// Common validation constants
export const VALIDATION_CONSTANTS = {
  // String lengths
  EMAIL_MAX_LENGTH: 255,
  NAME_MAX_LENGTH: 100,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100,
  SEARCH_MAX_LENGTH: 100,
  
  // Pagination limits
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
  
  // Bulk operation limits
  MAX_BULK_OPERATIONS: 50,
  
  // Regular expressions
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  STRONG_PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  NAME_REGEX: /^[a-zA-Z\s'-]+$/,
  
  // Error messages
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please provide a valid email address',
  INVALID_PASSWORD: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  INVALID_ID: 'Invalid ID format',
  PAGINATION_ERROR: 'Invalid pagination parameters'
} as const;

// Utility function to create custom validation messages
export const createValidationMessage = (field: string, rule: string): string => {
  return `${field} ${rule}`;
};

// Common validation helpers
export const isValidEmail = (email: string): boolean => {
  return VALIDATION_CONSTANTS.EMAIL_REGEX.test(email);
};

export const isStrongPassword = (password: string): boolean => {
  return VALIDATION_CONSTANTS.STRONG_PASSWORD_REGEX.test(password);
};

export const sanitizeSearchTerm = (term: string): string => {
  return term.trim().toLowerCase();
};

// Export common types
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SortInput = z.infer<typeof sortSchema>; 