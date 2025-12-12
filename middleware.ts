// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/login", 
  },
});

export const config = {
  // Protege tudo, EXCETO as rotas de API do telegram e auth
  matcher: [
    "/((?!api/webhook|api/auth|api/setup|_next/static|_next/image|favicon.ico).*)",
  ],
};