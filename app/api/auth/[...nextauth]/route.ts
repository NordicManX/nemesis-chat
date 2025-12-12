// app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const useSecureCookies = process.env.NODE_ENV === 'production';
const cookiePrefix = useSecureCookies ? '__Secure-' : '';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);

        if (!passwordMatch) return null;

        // Retornamos tudo o que queremos salvar na sessão
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar,
          role: user.role,           // <--- IMPORTANTE
          department: user.department // <--- IMPORTANTE
        };
      }
    })
  ],
  
  // AQUI A MÁGICA: Passamos os dados do login para o Token e do Token para a Sessão
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.department = user.department;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.department = token.department;
      }
      return session;
    }
  },

  pages: {
    signIn: '/auth/login',
  },
  
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, 
  },

  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      }
    }
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };