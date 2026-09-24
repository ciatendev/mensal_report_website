/**
 * GET  /api/annual-actions/change-requests  — Lista solicitações (SUPER_USER: todas PENDING; USER: as próprias)
 * POST /api/annual-actions/change-requests  — Cria solicitação de edição ou exclusão
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUser } from "@/lib/auth-helpers";
import { sendActivitySubmittedEmail } from "@/lib/mailer";

const createSchema = z.object({
  recordId:   z.string().min(1),
  type:       z.enum(["EDIT", "DELETE"]),
  nota:       z.string().optional(),
  editFields: z.record(z.unknown()).optional(), // campos a editar (para type=EDIT)
});

export async function GET(req: NextRequest) {
  const user = await getApprovedUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const onlyPending = searchParams.get("pending") === "1";

  const where = {
    ...(user.role !== "SUPER_USER" ? { requestedById: user.id } : {}),
    ...(onlyPending ? { status: "PENDING" as const } : {}),
  };

  const requests = await prisma.changeRequest.findMany({
    where,
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      reviewedBy:  { select: { id: true, name: true } },
      record: {
        select: {
          id: true, nome: true, equipe: true, indicador: true,
          activityStatus: true, syncedToSheets: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
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

  // SUPER_USER executa direto — sem solicitação
  if (user.role === "SUPER_USER") {
    return NextResponse.json({ error: "SUPER_USER deve usar a API diretamente." }, { status: 400 });
  }

  // Verifica se o registro existe e pertence à equipe do usuário
  const record = await prisma.activityRecord.findUnique({ where: { id: parsed.data.recordId } });
  if (!record) return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });

  const team = await prisma.team.findFirst({
    where: { nome: record.equipe },
    include: { membros: true },
  });
  const isMember = team?.membros.some((m) => m.userId === user.id) || record.authorId === user.id;
  if (!isMember) {
    return NextResponse.json({ error: "Sem permissão para solicitar alteração neste registro." }, { status: 403 });
  }

  // Cancela solicitação pendente anterior do mesmo tipo para o mesmo registro
  await prisma.changeRequest.updateMany({
    where: { recordId: parsed.data.recordId, requestedById: user.id, status: "PENDING" },
    data:  { status: "REJECTED", reviewNote: "Substituída por nova solicitação." },
  });

  const changeRequest = await prisma.changeRequest.create({
    data: {
      recordId:      parsed.data.recordId,
      requestedById: user.id,
      type:          parsed.data.type,
      nota:          parsed.data.nota,
      editFields:    parsed.data.editFields ? JSON.stringify(parsed.data.editFields) : null,
    },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      record:      { select: { id: true, nome: true, equipe: true, indicador: true } },
    },
  });

  // Notifica SUPER_USERs
  prisma.user
    .findMany({ where: { role: "SUPER_USER", status: "APPROVED" }, select: { email: true } })
    .then(async (supers) => {
      const emails = supers.map((u) => u.email).filter((e): e is string => !!e);
      if (!emails.length) return;
      const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const typeLabel = parsed.data.type === "DELETE" ? "exclusão" : "edição";
      await sendActivitySubmittedEmail({
        to:              emails,
        authorName:      user.name ?? user.email ?? "Usuário",
        authorEmail:     user.email ?? "",
        recordNome:      `[Solicitação de ${typeLabel}] ${changeRequest.record.nome}`,
        recordIndicador: changeRequest.record.indicador,
        recordEquipe:    changeRequest.record.equipe,
        validacaoUrl:    `${appUrl}/annualActionsReport`,
      });
    })
    .catch((e) => console.error("[change-requests] email error:", e));

  return NextResponse.json(changeRequest, { status: 201 });
}
