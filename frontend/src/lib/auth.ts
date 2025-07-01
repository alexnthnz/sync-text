import NextAuth, { type DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { Env } from "./env"
import dayjs from "dayjs"

// Extend the session to include additional user data
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      email: string
      token?: string
      expire_at?: string
    } & DefaultSession["user"]
  }
  
  interface User {
    id: string
    username: string
    email: string
    token: string
    expire_at: string
  }

  interface JWT {
    id: string
    username: string
    email: string
    token: string
    expire_at: string
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Login to your existing backend
          const response = await fetch(`${Env.BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            return null
          }

          const data = await response.json()
          
          // Backend now returns: { token, expire_at }
          if (data.data?.token && data.data?.expire_at) {
            // We need to get user info from the backend using the token
            const userResponse = await fetch(`${Env.BACKEND_URL}/api/auth/profile`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${data.data.token}`,
                "Content-Type": "application/json",
              },
            })

            if (!userResponse.ok) {
              return null
            }

            const userData = await userResponse.json()
            
            if (userData.data) {
              return {
                id: userData.data.id,
                email: userData.data.email,
                username: userData.data.username,
                token: data.data.token,
                expire_at: data.data.expire_at,
              }
            }
          }

          return null
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Store the backend token and expiration in the JWT
      if (user) {
        token.id = user.id as string
        token.username = user.username as string
        token.email = user.email as string
        token.token = user.token as string
        token.expire_at = user.expire_at as string
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.user.id = token.id as string
      session.user.username = token.username as string
      session.user.email = token.email as string
      session.user.token = token.token as string
      session.user.expire_at = token.expire_at as string
      
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: Env.AUTH_SECRET,
})

// Helper function to get backend token from session
export async function getBackendToken() {
  const session = await auth()
  return session?.user?.token || null
}

// Helper function to check if token is expired
export async function isTokenExpired() {
  const session = await auth()
  if (!session?.user?.expire_at) {
    return true
  }
  
  return dayjs(session.user.expire_at).isBefore(dayjs())
}

// Helper function to get token expiration time
export async function getTokenExpiration() {
  const session = await auth()
  return session?.user?.expire_at || null
} 