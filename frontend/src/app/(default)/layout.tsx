"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useWindowSize } from "@uidotdev/usehooks"
import { Header, Sidebar } from "@/components/layouts"
import { FullScreenLoading } from "@/components/ui"
import { connectAutoDispatch, setSidebarOpen, setUser, clearUser } from "@/store"
import type { RootState, User } from "@/store"

interface DefaultLayoutProps {
  children: React.ReactNode
  setSidebarOpen: (open: boolean) => void
  setUser: (user: User) => void
  clearUser: () => void
  isSidebarOpen: boolean
}

// Helper function to convert NextAuth session user to Redux User
const sessionUserToReduxUser = (sessionUser: any): User => ({
  id: sessionUser.id,
  email: sessionUser.email,
  username: sessionUser.username,
  token: sessionUser.token,
  expire_at: sessionUser.expire_at,
})

const DefaultLayout = ({ 
  children, 
  setSidebarOpen, 
  setUser,
  clearUser,
  isSidebarOpen 
}: DefaultLayoutProps) => {
  const { data: session, status } = useSession()
  const { width } = useWindowSize()

  // Sync NextAuth session with Redux state
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Initialize Redux user state from NextAuth session
      const reduxUser = sessionUserToReduxUser(session.user)
      setUser(reduxUser)
    } else if (status === "unauthenticated") {
      // Clear Redux user state when logged out
      clearUser()
    }
  }, [session, status, setUser, clearUser])

  // Handle responsive behavior with useWindowSize hook
  useEffect(() => {
    if (width !== null) {
      if (width >= 1024) {
        setSidebarOpen(true) // Keep sidebar open on desktop
      } else {
        setSidebarOpen(false) // Close sidebar on mobile
      }
    }
  }, [width, setSidebarOpen])

  // Show loading for unauthenticated users
  if (status === "loading") {
    return <FullScreenLoading text="Loading application..." />
  }

  // If user is not authenticated, show children without layout
  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden lg:ml-64">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {/* Content */}
          <div className="py-6">
            <div className="mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default connectAutoDispatch(
  (state: RootState) => ({
    isSidebarOpen: state.ui.sidebarOpen,
  }),
  {
    setSidebarOpen,
    setUser,
    clearUser,
  }
)(DefaultLayout)