// Centralized Document Types - Single Source of Truth

export interface User {
  id: string
  email: string
  username: string
}

export interface DocumentUser {
  userId: string
  role: string
  user: User
}

export interface Document {
  id: string
  title: string
  content?: string
  ownerId: string
  createdAt: string
  updatedAt: string
  owner: User
  collaboratorsCount?: number
  collaborators?: DocumentUser[]
}

export interface DocumentPagination {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNext: boolean
  hasPrev: boolean
}

// API Response Types
export interface DocumentResult {
  success: boolean
  message: string
  data?: Document | unknown
  errors?: {
    field?: string
    message: string
  }[]
}

export interface DocumentListResult {
  success: boolean
  message: string
  data?: {
    documents: Document[]
    pagination: DocumentPagination | null
  }
  errors?: {
    field?: string
    message: string
  }[]
}

// Document filter types
export type DocumentFilter = 'accessible' | 'owned' | 'shared'

// Cached result for a specific query
export interface CachedResult {
  documents: Document[]
  pagination: DocumentPagination
  timestamp: number
}

// Individual collection state for each filter type
export interface DocumentCollectionState {
  cache: Record<string, CachedResult>
  isLoading: boolean
  error: string | null
}

// State Management Types - Cache-based storage for each filter
export interface DocumentState {
  accessible: DocumentCollectionState  // All Documents page
  owned: DocumentCollectionState       // My Documents page
  shared: DocumentCollectionState      // Shared with Me page
} 