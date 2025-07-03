import { z } from 'zod';
import { uuidSchema } from '../../shared/validation/common.validation';

// Edit history validation schemas
export const createEditHistorySchema = z.object({
  documentId: uuidSchema,
  operation: z.any(), // JSON operation data
  version: z
    .number()
    .int()
    .positive('Version must be a positive integer')
    .optional(),
});

export const getEditHistoryQuerySchema = z.object({
  documentId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  limit: z
    .string()
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num > 0 && num <= 100;
    }, 'Limit must be between 1 and 100')
    .optional(),
  page: z
    .string()
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num > 0;
    }, 'Page must be a positive number')
    .optional(),
  cursor: z
    .string()
    .min(1, 'Cursor cannot be empty')
    .optional(),
  startDate: z
    .string()
    .datetime('Start date must be a valid ISO date string')
    .optional(),
  endDate: z
    .string()
    .datetime('End date must be a valid ISO date string')
    .optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
});

// URL parameter validation
export const editHistoryIdParamSchema = z.object({
  id: uuidSchema,
});

export const documentEditHistoryParamSchema = z.object({
  documentId: uuidSchema,
});

// Export types for use in controllers
export type CreateEditHistoryInput = z.infer<typeof createEditHistorySchema>;
export type GetEditHistoryQuery = z.infer<typeof getEditHistoryQuerySchema>;
export type EditHistoryIdParam = z.infer<typeof editHistoryIdParamSchema>;
export type DocumentEditHistoryParam = z.infer<typeof documentEditHistoryParamSchema>; 