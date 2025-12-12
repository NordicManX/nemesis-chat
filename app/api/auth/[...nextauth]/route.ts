// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const handler = NextAuth({
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

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      }
    })
  ],
  pages: {
    signIn: '/auth/login',
  },
  
  // Configurações de sessão
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutos (em segundos). O login expira rápido.
  },
  // Opcional: Para tentar forçar limpeza ao fechar o navegador
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  },
  // ---------------------------

  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };