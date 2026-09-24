/**
 * PATCH  /api/teams/[id]  — Edita nome/descrição e membros da equipe (SUPER_USER)
 * DELETE /api/teams/[id]  — Remove a equipe (SUPER_USER)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUser } from "@/lib/auth-helpers";

const patchSchema = z.object({
  nome:         z.string().min(1).max(100).optional(),
  descricao:    z.string().optional(),
  addMembers:   z.array(z.string()).optional(), // userIds para adicionar
  removeMembers:z.array(z.string()).optional(), // userIds para remover
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApprovedUser();
  if (!user || user.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { nome, descricao, addMembers, removeMembers } = parsed.data;

  // Executa atualizações em transação
  await prisma.$transaction(async (tx) => {
    if (nome || descricao !== undefined) {
      await tx.team.update({
        where: { id: params.id },
        data: { nome, descricao },
      });
    }

    if (removeMembers?.length) {
      await tx.teamMember.deleteMany({
        where: { teamId: params.id, userId: { in: removeMembers } },
      });
    }

    if (addMembers?.length) {
      await tx.teamMember.createMany({
        data:            addMembers.map((userId) => ({ teamId: params.id, userId })),
        skipDuplicates:  true,
      });
    }
  });

  const team = await prisma.team.findUnique({
    where: { id: params.id },
    include: {
      membros: { include: { user: { select: { id: true, name: true, email: true, status: true } } } },
    },
  });

  return NextResponse.json(team);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApprovedUser();
  if (!user || user.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  await prisma.team.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
