/**
 * GET /api/annual-actions/summary
 *
 * Retorna TODOS os registros aprovados para alimentar as telas
 * "Por Equipe" e "Síntese CIATEN". Acessível a qualquer usuário aprovado.
 *
 * Registros não-aprovados nunca são expostos aqui — apenas
 * activityStatus === APPROVED é incluído.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getApprovedUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const records = await prisma.activityRecord.findMany({
    where: { activityStatus: "APPROVED" },
    select: {
      id:              true,
      equipe:          true,
      indicadorKey:    true,
      indicador:       true,
      nome:            true,
      tipo:            true,
      statusAtividade: true,
      evidencia:       true,
      alcance:         true,
      valorAprovado:   true,
      moeda:           true,
      financiador:     true,
      ano:             true,
      activityStatus:  true,
      syncedToSheets:  true,
      // Não expõe authorId nem dados do autor para usuários comuns
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(records);
}
