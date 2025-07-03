import 'next-auth/jwt'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      accessToken: string;
      expireAt: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    username: string;
    email: string;
    accessToken: string;
    expireAt: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    email: string;
    accessToken: string;
    expireAt: string;
  }
} 