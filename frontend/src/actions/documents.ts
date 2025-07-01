"use server"

import { Env } from "@/lib/env"
import { auth } from "@/lib/auth"
import {
  createDocumentSchema,
  updateDocumentSchema,
  getDocumentsSchema,
  addCollaboratorSchema,
  type CreateDocumentFormData,
  type UpdateDocumentFormData,
  type GetDocumentsQueryData,
  type AddCollaboratorFormData,
} from "@/schemas"

// Common result types
export type DocumentResult = {
  success: boolean
  message: string
  data?: any
  errors?: {
    field?: string
    message: string
  }[]
}

// Helper function to get authenticated headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const session = await auth()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (session?.user?.token) {
    headers.Authorization = `Bearer ${session.user.token}`
  }

  return headers
}

// Get documents with filtering and search
export async function getDocuments(queryData?: GetDocumentsQueryData): Promise<DocumentResult> {
  try {
    const session = await auth()
    if (!session?.user?.token) {
      return {
        success: false,
        message: "Authentication required",
      }
    }

    // Validate query parameters
    const validatedQuery = getDocumentsSchema.parse(queryData || {})
    
    // Build query string
    const searchParams = new URLSearchParams()
    if (validatedQuery.filter) searchParams.set("filter", validatedQuery.filter)
    if (validatedQuery.search) searchParams.set("search", validatedQuery.search)
    if (validatedQuery.limit) searchParams.set("limit", validatedQuery.limit.toString())
    
    const queryString = searchParams.toString()
    const url = `${Env.BACKEND_URL}/api/documents${queryString ? `?${queryString}` : ""}`

    const response = await fetch(url, {
      method: "GET",
      headers: await getAuthHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Failed to fetch documents",
      }
    }

    return {
      success: true,
      message: result.message || "Documents retrieved successfully",
      data: result.data,
    }
  } catch (error) {
    console.error("Get documents error:", error)
    return {
      success: false,
      message: "An unexpected error occurred while fetching documents",
    }
  }
}

// Create new document
export async function createDocument(data: CreateDocumentFormData): Promise<DocumentResult> {
  try {
    const session = await auth()
    if (!session?.user?.token) {
      return {
        success: false,
        message: "Authentication required",
      }
    }

    // Validate the data
    const validatedData = createDocumentSchema.parse(data)

    const response = await fetch(`${Env.BACKEND_URL}/api/documents`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(validatedData),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Failed to create document",
        errors: result.errors || [{ message: result.message || "Creation failed" }]
      }
    }

    return {
      success: true,
      message: result.message || "Document created successfully",
      data: result.data,
    }
  } catch (error) {
    console.error("Create document error:", error)
    return {
      success: false,
      message: "An unexpected error occurred while creating the document",
    }
  }
}

// Get single document by ID
export async function getDocument(id: string): Promise<DocumentResult> {
  try {
    const session = await auth()
    if (!session?.user?.token) {
      return {
        success: false,
        message: "Authentication required",
      }
    }

    if (!id || typeof id !== 'string') {
      return {
        success: false,
        message: "Valid document ID is required",
      }
    }

    const response = await fetch(`${Env.BACKEND_URL}/api/documents/${id}`, {
      method: "GET",
      headers: await getAuthHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: "Document not found or access denied",
        }
      }
      return {
        success: false,
        message: result.message || "Failed to fetch document",
      }
    }

    return {
      success: true,
      message: result.message || "Document retrieved successfully",
      data: result.data,
    }
  } catch (error) {
    console.error("Get document error:", error)
    return {
      success: false,
      message: "An unexpected error occurred while fetching the document",
    }
  }
}

// Update document
export async function updateDocument(id: string, data: UpdateDocumentFormData): Promise<DocumentResult> {
  try {
    const session = await auth()
    if (!session?.user?.token) {
      return {
        success: false,
        message: "Authentication required",
      }
    }

    if (!id || typeof id !== 'string') {
      return {
        success: false,
        message: "Valid document ID is required",
      }
    }

    // Validate the data
    const validatedData = updateDocumentSchema.parse(data)

    const response = await fetch(`${Env.BACKEND_URL}/api/documents/${id}`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(validatedData),
    })

    const result = await response.json()

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: "Document not found or insufficient permissions",
        }
      }
      return {
        success: false,
        message: result.message || "Failed to update document",
        errors: result.errors || [{ message: result.message || "Update failed" }]
      }
    }

    return {
      success: true,
      message: result.message || "Document updated successfully",
      data: result.data,
    }
  } catch (error) {
    console.error("Update document error:", error)
    return {
      success: false,
      message: "An unexpected error occurred while updating the document",
    }
  }
}

// Delete document
export async function deleteDocument(id: string): Promise<DocumentResult> {
  try {
    const session = await auth()
    if (!session?.user?.token) {
      return {
        success: false,
        message: "Authentication required",
      }
    }

    if (!id || typeof id !== 'string') {
      return {
        success: false,
        message: "Valid document ID is required",
      }
    }

    const response = await fetch(`${Env.BACKEND_URL}/api/documents/${id}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: "Document not found or insufficient permissions",
        }
      }
      return {
        success: false,
        message: result.message || "Failed to delete document",
      }
    }

    return {
      success: true,
      message: result.message || "Document deleted successfully",
      data: result.data,
    }
  } catch (error) {
    console.error("Delete document error:", error)
    return {
      success: false,
      message: "An unexpected error occurred while deleting the document",
    }
  }
}

// Add collaborator to document
export async function addCollaborator(id: string, data: AddCollaboratorFormData): Promise<DocumentResult> {
  try {
    const session = await auth()
    if (!session?.user?.token) {
      return {
        success: false,
        message: "Authentication required",
      }
    }

    if (!id || typeof id !== 'string') {
      return {
        success: false,
        message: "Valid document ID is required",
      }
    }

    // Validate the data
    const validatedData = addCollaboratorSchema.parse(data)

    const response = await fetch(`${Env.BACKEND_URL}/api/documents/${id}/collaborators`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(validatedData),
    })

    const result = await response.json()

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: "Document not found or user not found",
        }
      }
      if (response.status === 403) {
        return {
          success: false,
          message: "Only document owner can add collaborators",
        }
      }
      if (response.status === 409) {
        return {
          success: false,
          message: result.message || "User is already a collaborator",
        }
      }
      return {
        success: false,
        message: result.message || "Failed to add collaborator",
        errors: result.errors || [{ message: result.message || "Failed to add collaborator" }]
      }
    }

    return {
      success: true,
      message: result.message || "Collaborator added successfully",
      data: result.data,
    }
  } catch (error) {
    console.error("Add collaborator error:", error)
    return {
      success: false,
      message: "An unexpected error occurred while adding the collaborator",
    }
  }
}

// Remove collaborator from document
export async function removeCollaborator(id: string, collaboratorId: string): Promise<DocumentResult> {
  try {
    const session = await auth()
    if (!session?.user?.token) {
      return {
        success: false,
        message: "Authentication required",
      }
    }

    if (!id || typeof id !== 'string' || !collaboratorId || typeof collaboratorId !== 'string') {
      return {
        success: false,
        message: "Valid document ID and collaborator ID are required",
      }
    }

    const response = await fetch(`${Env.BACKEND_URL}/api/documents/${id}/collaborators/${collaboratorId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: "Document not found, collaborator not found, or insufficient permissions",
        }
      }
      return {
        success: false,
        message: result.message || "Failed to remove collaborator",
      }
    }

    return {
      success: true,
      message: result.message || "Collaborator removed successfully",
      data: result.data,
    }
  } catch (error) {
    console.error("Remove collaborator error:", error)
    return {
      success: false,
      message: "An unexpected error occurred while removing the collaborator",
    }
  }
} 