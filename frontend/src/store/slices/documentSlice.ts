import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Document, DocumentFilter, DocumentPagination } from '@/types'

// Individual collection for each filter type
interface DocumentCollection {
  documents: Document[]
  pagination: DocumentPagination | null
  isLoading: boolean
  error: string | null
}

// Main document state with 3 separate collections
interface DocumentState {
  accessible: DocumentCollection
  owned: DocumentCollection
  shared: DocumentCollection
}

// Helper to create initial collection state
const createInitialCollection = (): DocumentCollection => ({
  documents: [],
  pagination: null,
  isLoading: false,
  error: null,
})

// Initial state
const initialState: DocumentState = {
  accessible: createInitialCollection(),
  owned: createInitialCollection(),
  shared: createInitialCollection(),
}

const documentSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    // Set loading state for a specific filter
    setLoading: (state, action: PayloadAction<{ filter: DocumentFilter; isLoading: boolean }>) => {
      const { filter, isLoading } = action.payload
      state[filter].isLoading = isLoading
      if (isLoading) {
        state[filter].error = null // Clear error when starting to load
      }
    },

    // Set documents and pagination for a specific filter
    setDocuments: (state, action: PayloadAction<{ 
      filter: DocumentFilter
      documents: Document[]
      pagination: DocumentPagination | null
    }>) => {
      const { filter, documents, pagination } = action.payload
      state[filter].documents = documents
      state[filter].pagination = pagination
      state[filter].isLoading = false
      state[filter].error = null
    },

    // Set error for a specific filter
    setError: (state, action: PayloadAction<{ filter: DocumentFilter; error: string }>) => {
      const { filter, error } = action.payload
      state[filter].error = error
      state[filter].isLoading = false
    },

    // Add a new document to relevant collections
    addDocument: (state, action: PayloadAction<{ document: Document; currentUserId?: string }>) => {
      const { document, currentUserId } = action.payload
      
      // Add to accessible (all documents)
      state.accessible.documents.unshift(document)
      
      // Add to owned if user is the owner
      if (currentUserId && document.ownerId === currentUserId) {
        state.owned.documents.unshift(document)
      }
      
      // Add to shared if user is not the owner
      if (currentUserId && document.ownerId !== currentUserId) {
        state.shared.documents.unshift(document)
      }
    },

    // Update a document in all collections where it exists
    updateDocument: (state, action: PayloadAction<Document>) => {
      const updatedDoc = action.payload
      
      // Update in all collections
      Object.keys(state).forEach((key) => {
        const filter = key as DocumentFilter
        const collection = state[filter]
        const index = collection.documents.findIndex(doc => doc.id === updatedDoc.id)
        if (index !== -1) {
          collection.documents[index] = updatedDoc
        }
      })
    },

    // Remove a document from all collections
    removeDocument: (state, action: PayloadAction<string>) => {
      const documentId = action.payload
      
      // Remove from all collections
      Object.keys(state).forEach((key) => {
        const filter = key as DocumentFilter
        state[filter].documents = state[filter].documents.filter(doc => doc.id !== documentId)
      })
    },

    // Clear all data for a specific filter
    clearFilter: (state, action: PayloadAction<DocumentFilter>) => {
      const filter = action.payload
      state[filter] = createInitialCollection()
    },

    // Clear all filters
    clearAll: (state) => {
      state.accessible = createInitialCollection()
      state.owned = createInitialCollection()
      state.shared = createInitialCollection()
    },
  },
})

export const {
  setLoading,
  setDocuments,
  setError,
  addDocument,
  updateDocument,
  removeDocument,
  clearFilter,
  clearAll,
} = documentSlice.actions

// Selectors
export const selectDocuments = (state: { documents: DocumentState }, filter: DocumentFilter): Document[] => {
  return state.documents[filter].documents
}

export const selectPagination = (state: { documents: DocumentState }, filter: DocumentFilter): DocumentPagination | null => {
  return state.documents[filter].pagination
}

export const selectIsLoading = (state: { documents: DocumentState }, filter: DocumentFilter): boolean => {
  return state.documents[filter].isLoading
}

export const selectError = (state: { documents: DocumentState }, filter: DocumentFilter): string | null => {
  return state.documents[filter].error
}

export const selectCollection = (state: { documents: DocumentState }, filter: DocumentFilter) => {
  return state.documents[filter]
}

// Get document counts for all filter types
export const selectDocumentCounts = (state: { documents: DocumentState }) => {
  const accessible = state.documents.accessible.documents
  const owned = state.documents.owned.documents  
  const shared = state.documents.shared.documents

  return {
    accessible: accessible.length,
    owned: owned.length,
    shared: shared.length,
  }
}

export default documentSlice.reducer 