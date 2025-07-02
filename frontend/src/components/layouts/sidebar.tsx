"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Button,
  Separator,
} from "@/components/ui"
import { 
  Home,
  FileText,
  User,
  Users,
  Clock,
  Settings,
  HelpCircle,
  Plus,
  X,
  PanelLeftClose,
  PanelLeft
} from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    name: "All Documents",
    href: "/documents",
    icon: FileText,
  },
  {
    name: "My Documents",
    href: "/documents?filter=owned",
    icon: User,
  },
  {
    name: "Shared with Me",
    href: "/documents?filter=shared",
    icon: Users,
  },
  {
    name: "Recent",
    href: "/documents?sort=recent",
    icon: Clock,
  },
]

const secondaryNavigation = [
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    name: "Help & Support",
    href: "/help",
    icon: HelpCircle,
  },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out",
          "bg-card border-r border-border",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-18" : "w-64"
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold">Navigation</h2>
          )}
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeft className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              // More specific active state logic
              const isActive = (() => {
                // Parse item URL to get its search params
                const itemUrl = new URL(item.href, 'http://localhost')
                const itemPath = itemUrl.pathname
                const itemParams = itemUrl.searchParams
                
                // Handle special cases for document routes
                if (item.href.startsWith('/documents')) {
                  // For document detail pages (/documents/[id]), only activate "All Documents"
                  if (pathname.match(/^\/documents\/[^\/]+$/)) {
                    return item.href === '/documents' // Only "All Documents" should be active
                  }
                  
                  // For document sub-pages (/documents/[id]/share), only activate "All Documents"  
                  if (pathname.match(/^\/documents\/[^\/]+\/.+$/)) {
                    return item.href === '/documents' // Only "All Documents" should be active
                  }
                  
                  // For /documents path, check exact query parameter match
                  if (pathname === '/documents') {
                    // Path must match
                    if (itemPath !== '/documents') {
                      return false
                    }
                    
                    // If item has no query params and current URL has no query params
                    if (item.href === '/documents' && !searchParams.toString()) {
                      return true
                    }
                    
                    // If item has query params, check if they match exactly
                    if (item.href.includes('?')) {
                      // Check if all item params match current params
                      for (const [key, value] of itemParams.entries()) {
                        if (searchParams.get(key) !== value) {
                          return false
                        }
                      }
                      
                      // Check if current has extra params that item doesn't have
                      for (const [key] of searchParams.entries()) {
                        if (!itemParams.has(key)) {
                          return false
                        }
                      }
                      
                      return true
                    }
                  }
                }
                
                // For non-documents routes, use exact match or nested path
                if (item.href !== "/" && !item.href.startsWith('/documents')) {
                  return pathname === item.href || pathname.startsWith(item.href + '/')
                }
                
                // Dashboard - only exact match
                if (item.href === "/") {
                  return pathname === "/"
                }
                
                return false
              })()
              const Icon = item.icon
              
              return (
                <Button
                  key={item.name}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isCollapsed ? "px-2" : "px-3",
                    isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  <Link href={item.href} title={isCollapsed ? item.name : undefined}>
                    <Icon className="w-4 h-4" />
                    {!isCollapsed && <span className="ml-3">{item.name}</span>}
                  </Link>
                </Button>
              )
            })}
          </div>

          {/* Quick Actions */}
          {!isCollapsed && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Quick Actions
                </h3>
                <div className="space-y-1">
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                  >
                    <Link href="/documents/new">
                      <Plus className="w-4 h-4" />
                      <span className="ml-3">New Document</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Secondary Navigation */}
          <div className={cn("mt-auto", isCollapsed ? "mt-8" : "mt-6")}>
            <Separator className="mb-4" />
            {!isCollapsed && (
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                More
              </h3>
            )}
            <div className="space-y-1">
              {secondaryNavigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                
                return (
                  <Button
                    key={item.name}
                    asChild
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isCollapsed ? "px-2" : "px-3",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    <Link href={item.href} title={isCollapsed ? item.name : undefined}>
                      <Icon className="w-4 h-4" />
                      {!isCollapsed && <span className="ml-3">{item.name}</span>}
                    </Link>
                  </Button>
                )
              })}
            </div>
          </div>
        </nav>
      </div>
    </>
  )
} 