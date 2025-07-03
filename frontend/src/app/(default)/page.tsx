"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator
} from "@/components/ui"
import { 
  Plus, 
  FileText, 
  Users, 
  Settings, 
  Calendar,
  Activity,
  Zap,
  Shield,
  Puzzle
} from "lucide-react"

export default function Home() {
  const { data: session } = useSession()

  if (session) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {session.user.username}!
          </h1>
          <p className="text-muted-foreground">
            Your document workspace dashboard
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="group hover:shadow-md transition-shadow cursor-pointer py-3 gap-0">
              <Link href="/documents/new">
                <CardHeader className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">New Document</CardTitle>
                      <CardDescription className="text-xs">Create a new document</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>

            <Card className="group hover:shadow-md transition-shadow cursor-pointer py-3 gap-0">
              <Link href="/documents">
                <CardHeader className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">All Documents</CardTitle>
                      <CardDescription className="text-xs">Browse all documents</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>

            <Card className="group hover:shadow-md transition-shadow cursor-pointer py-3 gap-0">
              <Link href="/documents?filter=shared">
                <CardHeader className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
                      <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Shared</CardTitle>
                      <CardDescription className="text-xs">Collaborative docs</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>

            <Card className="group hover:shadow-md transition-shadow cursor-pointer py-3 gap-0">
              <Link href="/settings">
                <CardHeader className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Settings</CardTitle>
                      <CardDescription className="text-xs">Manage preferences</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="py-4 gap-3">
            <CardHeader className="px-4 py-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Documents</CardTitle>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-center py-4">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  No recent documents yet
                </p>
                <Button asChild size="sm">
                  <Link href="/documents/new">
                    <Plus className="w-3 h-3 mr-2" />
                    Create your first document
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="py-4 gap-3">
            <CardHeader className="px-4 py-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-center py-4">
                <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Sync Text
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Collaborative document editing made simple. Create, edit, and share documents 
              with real-time collaboration and seamless synchronization.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/auth/signin">
                Sign In
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/auth/register">
                Get Started
              </Link>
            </Button>
          </div>

          <Separator className="my-12" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-none shadow-none">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Puzzle className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Real-time Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Work together with your team in real-time with live cursor tracking and instant updates.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-none">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Secure & Reliable</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Your documents are automatically saved and securely stored with role-based access control.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-none">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Built with modern technology for optimal performance and seamless user experience.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
