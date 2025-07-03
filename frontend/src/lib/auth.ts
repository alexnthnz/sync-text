import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { Env } from "./env"
import dayjs from "dayjs"

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
                accessToken: data.data.token,
                expireAt: data.data.expire_at,
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
        token.accessToken = user.accessToken as string
        token.expireAt = user.expireAt as string
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.user.id = token.id as string
      session.user.username = token.username as string
      session.user.email = token.email as string
      session.user.accessToken = token.accessToken as string
      session.user.expireAt = token.expireAt as string
      
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
  return session?.user?.accessToken || null
}

// Helper function to check if token is expired
export async function isTokenExpired() {
  const session = await auth()
  if (!session?.user?.expireAt) {
    return true
  }
  
  return dayjs(session.user.expireAt).isBefore(dayjs())
}

// Helper function to get token expiration time
export async function getTokenExpiration() {
  const session = await auth()
  return session?.user?.expireAt || null
} 