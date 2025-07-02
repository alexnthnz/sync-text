"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useWindowSize } from "@uidotdev/usehooks"
import { Header, Sidebar } from "@/components/layouts"
import { FullScreenLoading } from "@/components/ui"
import { useSelector, useDispatch } from "react-redux"
import { setSidebarOpen, setUser, clearUser } from "@/store"
import type { RootState, User } from "@/store"

interface DefaultLayoutProps {
  children: React.ReactNode
}

// Helper function to convert NextAuth session user to Redux User
const sessionUserToReduxUser = (sessionUser: {
  id: string
  email: string
  username: string
  token: string
  expire_at: string
}): User => ({
  id: sessionUser.id,
  email: sessionUser.email,
  username: sessionUser.username,
  token: sessionUser.token,
  expire_at: sessionUser.expire_at,
})

const DefaultLayout = ({ children }: DefaultLayoutProps) => {
  const dispatch = useDispatch()
  const isSidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen)
  const { data: session, status } = useSession()
  const { width } = useWindowSize()

  // Sync NextAuth session with Redux state
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Initialize Redux user state from NextAuth session
      const reduxUser = sessionUserToReduxUser(session.user)
      dispatch(setUser(reduxUser))
    } else if (status === "unauthenticated") {
      // Clear Redux user state when logged out
      dispatch(clearUser())
    }
  }, [session, status, dispatch])

  // Handle responsive behavior with useWindowSize hook
  useEffect(() => {
    if (width !== null) {
      if (width >= 1024) {
        dispatch(setSidebarOpen(true)) // Keep sidebar open on desktop
      } else {
        dispatch(setSidebarOpen(false)) // Close sidebar on mobile
      }
    }
  }, [width, dispatch])

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
        onClose={() => dispatch(setSidebarOpen(false))}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden lg:ml-64">
        {/* Header */}
        <Header onMenuClick={() => dispatch(setSidebarOpen(true))} />

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

export default DefaultLayout