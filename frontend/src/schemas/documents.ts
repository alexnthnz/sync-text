import { z } from "zod"

// Document creation schema
export const createDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters")
    .transform(val => val.trim()),
  content: z
    .string()
    .optional()
    .default(""),
})

// Document update schema
export const updateDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters")
    .transform(val => val.trim())
    .optional(),
  content: z
    .string()
    .optional(),
})

// Get documents query schema
export const getDocumentsSchema = z.object({
  filter: z
    .enum(["owned", "accessible"])
    .optional()
    .default("accessible"),
  search: z
    .string()
    .optional(),
  limit: z
    .number()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(20),
})

// Add collaborator schema
export const addCollaboratorSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase()
    .transform(val => val.trim()),
  role: z
    .enum(["editor", "viewer"])
    .optional()
    .default("editor"),
})

// Document ID validation schema
export const documentIdSchema = z.object({
  id: z
    .string()
    .min(1, "Document ID is required")
    .uuid("Invalid document ID format"),
})

// Collaborator ID validation schema
export const collaboratorIdSchema = z.object({
  collaboratorId: z
    .string()
    .min(1, "Collaborator ID is required")
    .uuid("Invalid collaborator ID format"),
})

// Export type definitions
export type CreateDocumentFormData = z.infer<typeof createDocumentSchema>
export type UpdateDocumentFormData = z.infer<typeof updateDocumentSchema>
export type GetDocumentsQueryData = z.infer<typeof getDocumentsSchema>
export type AddCollaboratorFormData = z.infer<typeof addCollaboratorSchema>
export type DocumentIdData = z.infer<typeof documentIdSchema>
export type CollaboratorIdData = z.infer<typeof collaboratorIdSchema> 