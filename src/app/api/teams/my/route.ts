/**
 * GET /api/teams/my — Retorna a equipe do usuário logado (ou null).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getApprovedUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const membership = await prisma.teamMember.findFirst({
    where:   { userId: user.id },
    include: { team: { include: { membros: { include: { user: { select: { id: true, name: true, email: true } } } } } } },
  });

  return NextResponse.json(membership?.team ?? null);
}
