import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * busca a sessão atual E confirma que o usuário realmente existe no banco
 */
export async function getVerifiedUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  // Usuário não existe mais no banco, trata como
  // não autenticado
  if (!dbUser) return null;

  return dbUser;
}

export async function getApprovedUser(): Promise<User | null> {
  const user = await getVerifiedUser();
  if (!user || user.status !== "APPROVED") return null;
  return user;
}
