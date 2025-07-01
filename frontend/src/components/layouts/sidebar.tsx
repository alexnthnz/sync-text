"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
              const isActive = pathname === item.href || (
                item.href !== "/" && pathname.startsWith(item.href.split('?')[0] + '/')
              )
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