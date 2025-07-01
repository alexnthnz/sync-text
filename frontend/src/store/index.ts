import { configureStore } from '@reduxjs/toolkit'
import logger from 'redux-logger'
import authSlice from './slices/authSlice'
import uiSlice from './slices/uiSlice'
import documentSlice from './slices/documentSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    ui: uiSlice,
    documents: documentSlice,
  },
  middleware: (getDefaultMiddleware) => {
    const middleware = getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    })

    // Add redux-logger only in development
    if (process.env.NODE_ENV === 'development') {
      return middleware.concat(logger)
    }

    return middleware
  },
  devTools: process.env.NODE_ENV !== 'production',
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store

// Re-export hooks and utilities
export * from './hooks'
export { connectAutoDispatch } from './utils/connectAutoDispatch'

// Export types and specific actions to avoid naming conflicts
export type { User } from './slices/authSlice'
export type { Document, DocumentUser } from './slices/documentSlice'

// Export slice actions with proper namespacing
export { 
  setLoading as setAuthLoading,
  setUser,
  clearUser,
  setError as setAuthError,
  clearError as clearAuthError 
} from './slices/authSlice'

export {
  toggleSidebar,
  setSidebarOpen,
  setGlobalLoading,
  showNotification,
  hideNotification,
  openModal,
  closeModal,
  closeAllModals,
} from './slices/uiSlice'

export {
  setLoading as setDocumentLoading,
  setDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  setCurrentDocument,
  setDocumentUsers,
  setError as setDocumentError,
  clearError as clearDocumentError,
  setSearchQuery,
  setSorting,
} from './slices/documentSlice' 