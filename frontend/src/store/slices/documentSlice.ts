import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Document {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  ownerId: string
  isPublic: boolean
}

export interface DocumentUser {
  id: string
  userId: string
  documentId: string
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  user: {
    id: string
    email: string
  }
}

interface DocumentState {
  documents: Document[]
  currentDocument: Document | null
  documentUsers: DocumentUser[]
  isLoading: boolean
  error: string | null
  searchQuery: string
  sortBy: 'title' | 'createdAt' | 'updatedAt'
  sortOrder: 'asc' | 'desc'
}

const initialState: DocumentState = {
  documents: [],
  currentDocument: null,
  documentUsers: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
}

const documentSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setDocuments: (state, action: PayloadAction<Document[]>) => {
      state.documents = action.payload
      state.error = null
    },
    addDocument: (state, action: PayloadAction<Document>) => {
      state.documents.unshift(action.payload)
    },
    updateDocument: (state, action: PayloadAction<Document>) => {
      const index = state.documents.findIndex(doc => doc.id === action.payload.id)
      if (index !== -1) {
        state.documents[index] = action.payload
      }
      if (state.currentDocument?.id === action.payload.id) {
        state.currentDocument = action.payload
      }
    },
    deleteDocument: (state, action: PayloadAction<string>) => {
      state.documents = state.documents.filter(doc => doc.id !== action.payload)
      if (state.currentDocument?.id === action.payload) {
        state.currentDocument = null
      }
    },
    setCurrentDocument: (state, action: PayloadAction<Document | null>) => {
      state.currentDocument = action.payload
    },
    setDocumentUsers: (state, action: PayloadAction<DocumentUser[]>) => {
      state.documentUsers = action.payload
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },
    clearError: (state) => {
      state.error = null
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    setSorting: (state, action: PayloadAction<{
      sortBy: 'title' | 'createdAt' | 'updatedAt'
      sortOrder: 'asc' | 'desc'
    }>) => {
      state.sortBy = action.payload.sortBy
      state.sortOrder = action.payload.sortOrder
    },
  },
})

export const {
  setLoading,
  setDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  setCurrentDocument,
  setDocumentUsers,
  setError,
  clearError,
  setSearchQuery,
  setSorting,
} = documentSlice.actions

export default documentSlice.reducer 