import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  sidebarOpen: boolean
  isGlobalLoading: boolean
  notification: {
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    isVisible: boolean
  } | null
  modals: {
    createDocument: boolean
    deleteDocument: boolean
    shareDocument: boolean
  }
}

const initialState: UiState = {
  sidebarOpen: true,
  isGlobalLoading: false,
  notification: null,
  modals: {
    createDocument: false,
    deleteDocument: false,
    shareDocument: false,
  },
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.isGlobalLoading = action.payload
    },
    showNotification: (state, action: PayloadAction<{
      message: string
      type: 'success' | 'error' | 'info' | 'warning'
    }>) => {
      state.notification = {
        ...action.payload,
        isVisible: true,
      }
    },
    hideNotification: (state) => {
      state.notification = null
    },
    openModal: (state, action: PayloadAction<keyof UiState['modals']>) => {
      state.modals[action.payload] = true
    },
    closeModal: (state, action: PayloadAction<keyof UiState['modals']>) => {
      state.modals[action.payload] = false
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key as keyof UiState['modals']] = false
      })
    },
  },
})

export const {
  toggleSidebar,
  setSidebarOpen,
  setGlobalLoading,
  showNotification,
  hideNotification,
  openModal,
  closeModal,
  closeAllModals,
} = uiSlice.actions

export default uiSlice.reducer 