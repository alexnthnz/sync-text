import { z } from 'zod';
import { emailSchema, uuidSchema } from '../../shared/validation/common.validation';

// Document validation schemas
export const createDocumentSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  content: z
    .string()
    .optional()
    .default(''),
});

export const updateDocumentSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be less than 255 characters')
    .trim()
    .optional(),
  content: z
    .string()
    .optional(),
}).refine((data) => data.title !== undefined || data.content !== undefined, {
  message: 'At least one field (title or content) must be provided',
});

export const addCollaboratorSchema = z.object({
  email: emailSchema,
  role: z
    .enum(['editor', 'viewer'])
    .optional()
    .default('editor'),
});

// Query parameter validation
export const getDocumentsQuerySchema = z.object({
  filter: z
    .enum(['owned', 'accessible', 'shared'])
    .optional(),
  search: z
    .string()
    .min(1, 'Search term cannot be empty')
    .max(100, 'Search term cannot exceed 100 characters')
    .trim()
    .optional(),
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
});

// URL parameter validation
export const documentIdParamSchema = z.object({
  id: uuidSchema,
});

export const collaboratorParamSchema = z.object({
  id: uuidSchema,
  collaboratorId: uuidSchema,
});

// Export types for use in controllers
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type AddCollaboratorInput = z.infer<typeof addCollaboratorSchema>;
export type GetDocumentsQuery = z.infer<typeof getDocumentsQuerySchema>;
export type DocumentIdParam = z.infer<typeof documentIdParamSchema>;
export type CollaboratorParam = z.infer<typeof collaboratorParamSchema>; 