// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter"; // Importante ter o Adapter
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Dados faltando');
        }
        
        // 1. Buscamos o usuário E os dados da organização dele
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true } // <--- Trazemos o status da empresa
        });

        if (!user) {
          throw new Error('Usuário não encontrado');
        }

        // 2. TRAVA DE LOGIN: Se a empresa estiver bloqueada, impede a entrada
        if (user.organization && !user.organization.isActive) {
            throw new Error('ACESSO BLOQUEADO: Sua empresa está com acesso suspenso.');
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);

        if (!passwordMatch) {
          throw new Error('Senha incorreta');
        }

        return user;
      }
    })
  ],
  
  callbacks: {
    // Passa dados do Usuário (Banco) para o Token JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.department = (user as any).department;
        token.organizationId = (user as any).organizationId; 
      }
      return token;
    },
    
    // Passa dados do Token JWT para a Sessão (Front/API)
    // E VERIFICA SE A EMPRESA AINDA ESTÁ ATIVA
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).department = token.department as string;
        (session.user as any).organizationId = token.organizationId as string;

        // 3. TRAVA DE NAVEGAÇÃO (Kick-out)
        // Verifica no banco se a empresa foi bloqueada DEPOIS do login
        if (token.organizationId) {
            const org = await prisma.organization.findUnique({
                where: { id: token.organizationId as string },
                select: { isActive: true }
            });

            // Se a empresa não existir mais ou estiver inativa, mata a sessão
            if (!org || !org.isActive) {
                return null as any; // Isso força o logout imediato no frontend
            }
        }
      }
      return session;
    }
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/login', // Redireciona erros (como bloqueio) para o login
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };