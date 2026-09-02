import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendAccessRequestEmail } from "@/lib/mailer";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user }) {
      if (!user.email) return false;

      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!dbUser) return true;

      if (dbUser.status === "BLOCKED") {
        return "/pending-approval?reason=blocked";
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      const email = user?.email ?? token.email;
      if (!email) return token;

      const REVALIDATE_INTERVAL = 5 * 60; // segundos
      const tokenAgeSeconds = token.iat
        ? Math.floor(Date.now() / 1000) - (token.iat as number)
        : Infinity;

      const isFreshLogin = !!user;
      const shouldRevalidate =
        isFreshLogin || trigger === "update" || tokenAgeSeconds > REVALIDATE_INTERVAL;

      if (shouldRevalidate) {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            role: true,
            status: true,
            accessRequestNotifiedAt: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.status = dbUser.status;

          // Pedido de acesso, dispara no momento de um login 
          // enquanto ainda está PENDING.
          if (isFreshLogin && dbUser.status === "PENDING" && !dbUser.accessRequestNotifiedAt) {
            try {
              const superUsers = await prisma.user.findMany({
                where: { role: "SUPER_USER", status: "APPROVED" },
                select: { email: true },
              });

              await sendAccessRequestEmail({
                to: superUsers
                  .map((u) => u.email)
                  .filter((e): e is string => !!e),
                requesterName: user?.name ?? token.name ?? "Novo usuário",
                requesterEmail: email,
              });
            } catch (err) {
              // Não deixa a falha do e-mail travar o login do usuário.
              console.error("[auth.jwt] Falha ao notificar pedido de acesso:", err);
            } finally {
              // Marca como notificado mesmo se o e-mail falhar
              await prisma.user
                .update({
                  where: { id: dbUser.id },
                  data: { accessRequestNotifiedAt: new Date() },
                })
                .catch(() => {});
            }
          }
        }
      }

      return token;
    },
  },
});
