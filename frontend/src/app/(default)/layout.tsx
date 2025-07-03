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

const sessionUserToReduxUser = (sessionUser: {
  id: string
  email: string
  username: string
  accessToken: string
  expireAt: string
}): User => ({
  id: sessionUser.id,
  email: sessionUser.email,
  username: sessionUser.username,
  accessToken: sessionUser.accessToken,
  expireAt: sessionUser.expireAt,
})

const DefaultLayout = ({ children }: DefaultLayoutProps) => {
  const dispatch = useDispatch()
  const isSidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen)
  const user = useSelector((state: RootState) => state.auth.user)
  const { data: session, status } = useSession()
  const { width } = useWindowSize()

  useEffect(() => {
    if (status === "authenticated" && session?.user && !user) {
      const reduxUser = sessionUserToReduxUser(session.user)
      dispatch(setUser(reduxUser))
    } else if (status === "unauthenticated") {
      dispatch(clearUser())
    }
  }, [session, status, dispatch])

  useEffect(() => {
    if (width !== null) {
      if (width >= 1024) {
        dispatch(setSidebarOpen(true)) 
      } else {
        dispatch(setSidebarOpen(false))
      }
    }
  }, [width, dispatch])

  if (status === "loading") {
    return <FullScreenLoading text="Loading application..." />
  }

  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => dispatch(setSidebarOpen(false))}
      />

      <div className="flex flex-col flex-1 overflow-hidden lg:ml-64">
        <Header onMenuClick={() => dispatch(setSidebarOpen(true))} />

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
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