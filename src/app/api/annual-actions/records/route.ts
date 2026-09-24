/**
 * GET  /api/annual-actions/records  — Lista registros
 * POST /api/annual-actions/records  — Cria novo registro
 *
 * Permissões:
 *   USER      → vê apenas registros da sua equipe (via TeamMember)
 *   SUPER_USER → vê todos
 *
 * Emails ao criar:
 *   → SUPER_USERs (validação pendente)
 *   → Membros da equipe (notificação de atividade criada)
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

export async function GET(req: NextRequest) {
  const user = await getApprovedUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const equipeFilter = searchParams.get("equipe");
  const anoFilter    = searchParams.get("ano") ? parseInt(searchParams.get("ano")!) : undefined;

  let equipeRestrita: string | undefined;

  if (user.role !== "SUPER_USER") {
    // Descobre a equipe do usuário
    const membership = await prisma.teamMember.findFirst({
      where:   { userId: user.id },
      include: { team: true },
    });
    equipeRestrita = membership?.team.nome;
    // Sem equipe → retorna apenas os próprios registros
    if (!equipeRestrita) {
      equipeRestrita = undefined;
    }
  }

  const where = {
    ...(user.role !== "SUPER_USER" && equipeRestrita
      ? { equipe: equipeRestrita }
      : user.role !== "SUPER_USER"
      ? { authorId: user.id }
      : {}
    ),
    ...(equipeFilter ? { equipe: equipeFilter } : {}),
    ...(anoFilter    ? { ano: anoFilter } : {}),
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

  // Usuário comum só pode registrar na própria equipe
  if (user.role !== "SUPER_USER") {
    const membership = await prisma.teamMember.findFirst({
      where:   { userId: user.id },
      include: { team: true },
    });
    const userTeam = membership?.team.nome;
    if (userTeam && parsed.data.equipe !== userTeam) {
      return NextResponse.json({ error: "Você só pode registrar atividades da sua própria equipe." }, { status: 403 });
    }
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

  // Dispara emails em background
  Promise.all([
    // 1. SUPER_USERs: notificação de registro pendente
    prisma.user
      .findMany({ where: { role: "SUPER_USER", status: "APPROVED" }, select: { email: true } })
      .then(async (supers) => {
        const emails = supers.map((u) => u.email).filter((e): e is string => !!e);
        if (!emails.length) return;
        const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        await sendActivitySubmittedEmail({
          to:              emails,
          authorName:      user.name ?? user.email ?? "Usuário",
          authorEmail:     user.email ?? "",
          recordNome:      record.nome,
          recordIndicador: record.indicador,
          recordEquipe:    record.equipe,
          validacaoUrl:    `${appUrl}/annualActionsReport`,
        });
      }),

    // 2. Membros da equipe (exceto o autor): aviso de nova atividade registrada
    prisma.team
      .findFirst({ where: { nome: parsed.data.equipe }, include: { membros: { include: { user: { select: { email: true, name: true } } } } } })
      .then(async (team) => {
        if (!team) return;
        const memberEmails = team.membros
          .map((m) => m.user.email)
          .filter((e): e is string => !!e && e !== user.email);
        if (!memberEmails.length) return;
        const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        await sendActivitySubmittedEmail({
          to:              memberEmails,
          authorName:      user.name ?? user.email ?? "Usuário",
          authorEmail:     user.email ?? "",
          recordNome:      record.nome,
          recordIndicador: record.indicador,
          recordEquipe:    record.equipe,
          validacaoUrl:    `${appUrl}/annualActionsReport`,
        });
      }),
  ]).catch((err) => console.error("[POST records] email error:", err));

  return NextResponse.json(record, { status: 201 });
}
