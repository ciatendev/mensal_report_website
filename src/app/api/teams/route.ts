/**
 * GET  /api/teams         — Lista todas as equipes (com membros)
 * POST /api/teams         — Cria nova equipe (SUPER_USER)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getApprovedUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const teams = await prisma.team.findMany({
      include: {
        membros: {
          include: { user: { select: { id: true, name: true, email: true, status: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(teams);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/teams]", msg);
    if (msg.includes("doesn't exist") || msg.includes("does not exist") || msg.includes("no such table")) {
      return NextResponse.json([], { status: 200 }); // retorna lista vazia se tabela não existe ainda
    }
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}

const createSchema = z.object({
  nome:      z.string().min(1).max(100),
  descricao: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getApprovedUser();
  if (!user || user.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Apenas coordenadores podem criar equipes." }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const team = await prisma.team.create({
      data: {
        nome:      parsed.data.nome,
        descricao: parsed.data.descricao,
        membros: parsed.data.memberIds?.length
          ? { create: parsed.data.memberIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: {
        membros: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    return NextResponse.json(team, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/teams]", msg);
    // Unique constraint = nome duplicado
    if (msg.includes("Unique constraint") || msg.includes("unique constraint")) {
      return NextResponse.json({ error: `Já existe uma equipe com o nome "${parsed.data.nome}".` }, { status: 409 });
    }
    // Tabela não existe = migration não foi aplicada
    if (msg.includes("doesn't exist") || msg.includes("does not exist") || msg.includes("no such table")) {
      return NextResponse.json({ error: "Tabela de equipes não encontrada. Execute a migration: npx prisma migrate deploy && npx prisma generate" }, { status: 503 });
    }
    return NextResponse.json({ error: `Erro interno: ${msg.slice(0, 200)}` }, { status: 500 });
  }
}
