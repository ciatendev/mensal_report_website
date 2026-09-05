/**
 * GET  /api/annual-actions/records  — Lista registros (filtrado por papel)
 * POST /api/annual-actions/records  — Cria novo registro (status PENDING, só no DB)
 *                                    + envia e-mail de notificação aos SUPER_USERs
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUser } from "@/lib/auth-helpers";
import { sendActivitySubmittedEmail } from "@/lib/mailer";
import { IndicadorKey } from "@prisma/client";

const createSchema = z.object({
  equipe:          z.string().min(1),
  indicadorKey:    z.nativeEnum(IndicadorKey),
  indicador:       z.string().min(1),
  nome:            z.string().min(1),
  ano:             z.number().int().min(2020).max(2099),
  tipo:            z.string().optional(),
  statusAtividade: z.string().optional(),
  evidencia:       z.string().optional(),
  dataRealizacao:  z.string().optional(),
  participantes:   z.string().optional(),
  canal:           z.string().optional(),
  alcance:         z.string().optional(),
  financiador:     z.string().optional(),
  valorAprovado:   z.string().optional(),
  moeda:           z.string().optional(),
});

// GET — usuário comum vê só os próprios; SUPER_USER vê todos
export async function GET(req: NextRequest) {
  const user = await getApprovedUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const equipeFilter = searchParams.get("equipe");
  const anoFilter    = searchParams.get("ano") ? parseInt(searchParams.get("ano")!) : undefined;

  const where = {
    ...(user.role !== "SUPER_USER" ? { authorId: user.id } : {}),
    ...(equipeFilter               ? { equipe: equipeFilter } : {}),
    ...(anoFilter                  ? { ano: anoFilter } : {}),
  };

  const records = await prisma.activityRecord.findMany({
    where,
    include: {
      author:      { select: { id: true, name: true, email: true } },
      validatedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(records);
}

// POST — cria registro no DB com status PENDING e notifica SUPER_USERs por email
export async function POST(req: NextRequest) {
  const user = await getApprovedUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const record = await prisma.activityRecord.create({
    data: {
      authorId:        user.id,
      ano:             parsed.data.ano,
      equipe:          parsed.data.equipe,
      indicadorKey:    parsed.data.indicadorKey,
      indicador:       parsed.data.indicador,
      nome:            parsed.data.nome,
      tipo:            parsed.data.tipo,
      statusAtividade: parsed.data.statusAtividade,
      evidencia:       parsed.data.evidencia,
      dataRealizacao:  parsed.data.dataRealizacao,
      participantes:   parsed.data.participantes,
      canal:           parsed.data.canal,
      alcance:         parsed.data.alcance,
      financiador:     parsed.data.financiador,
      valorAprovado:   parsed.data.valorAprovado,
      moeda:           parsed.data.moeda ?? "BRL",
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  // Notificar SUPER_USERs por e-mail (não bloqueia a resposta)
  prisma.user
    .findMany({ where: { role: "SUPER_USER", status: "APPROVED" }, select: { email: true } })
    .then(async (superUsers) => {
      const emails = superUsers.map((u) => u.email).filter((e): e is string => !!e);
      if (!emails.length) return;

      const appUrl        = process.env.NEXTAUTH_URL;
      const validacaoUrl  = `${appUrl}/annualActionsReport`;

      await sendActivitySubmittedEmail({
        to:              emails,
        authorName:      user.name ?? user.email ?? "Usuário",
        authorEmail:     user.email ?? "",
        recordNome:      record.nome,
        recordIndicador: record.indicador,
        recordEquipe:    record.equipe,
        validacaoUrl,
      });
    })
    .catch((err) => console.error("[POST records] Falha ao enviar e-mail:", err));

  return NextResponse.json(record, { status: 201 });
}
