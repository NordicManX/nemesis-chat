// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NextAuthSessionProvider from "./providers/session-provider"; // <--- O IMPORT QUE FALTAVA

export const metadata: Metadata = {
  title: "Nemesis Chat",
  description: "Sistema de Helpdesk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-gray-900 text-white">
        {}
        <NextAuthSessionProvider>
          {children}
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}