import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  const isPublicRoute =
    nextUrl.pathname === "/" || nextUrl.pathname === "/pending-approval";

  if (isPublicRoute) return NextResponse.next();

  // Sem sessão: volta para login
  if (!session?.user) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Não aprovado: tela de espera
  if (session.user.status !== "APPROVED") {
    return NextResponse.redirect(new URL("/pending-approval", nextUrl));
  }

  // Área administrativa exige SUPER_USER
  if (nextUrl.pathname.startsWith("/admin") && session.user.role !== "SUPER_USER") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Ignora:
     * - _next/static (arquivos de build estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - api/auth (rotas de autenticação)
     * - Arquivos estáticos comuns (png, jpg, jpeg, svg, gif, webp, ico)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};