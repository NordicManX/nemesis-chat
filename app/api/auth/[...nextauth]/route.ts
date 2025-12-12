// app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Detecta se estamos em produção (Vercel) para usar cookies seguros
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
  
  session: {
    strategy: "jwt",
    // Define a validade do Token para 30 minutos.
    // Mesmo que o navegador restaure o cookie, se passar de 30min, o token será inválido.
    maxAge: 30 * 60, 
  },

  // --- O SEGREDO ESTÁ AQUI ---
  // Sobrescrevemos o cookie padrão para tentar forçar o comportamento de "Sessão"
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        // NÃO definimos maxAge aqui dentro. 
        // Isso sinaliza pro navegador que é um "Session Cookie" (deve morrer ao fechar).
      }
    }
  },
  // ---------------------------

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };