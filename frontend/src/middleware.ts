import { auth } from "@/lib/auth"

export default auth((req) => {
  // Allow access to auth pages and public routes
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth
  
  // Public routes that don't require authentication
  const publicRoutes = [
    "/auth/signin", 
    "/auth/register",
  ]
  
  // Check if the current path is a public route
  if (publicRoutes.includes(pathname)) {
    return // Allow access to public routes
  }
  
  // Allow access to API routes (NextAuth handles its own auth)
  if (pathname.startsWith("/api/")) {
    return
  }
  
  // Require authentication for all other routes
  if (!isAuthenticated) {
    const signInUrl = new URL("/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return Response.redirect(signInUrl)
  }
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
} 