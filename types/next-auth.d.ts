// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * O que é retornado no hook useSession, getSession e no callback session
   */
  interface Session {
    user: {
      id: string
      role: string
      department: string
    } & DefaultSession["user"]
  }

  /**
   * O formato do User retornado no callback authorize
   */
  interface User {
    id: string
    role: string
    department: string
  }
}

declare module "next-auth/jwt" {
  /**
   * Campos extras que queremos no Token JWT
   */
  interface JWT {
    role: string
    department: string
  }
}