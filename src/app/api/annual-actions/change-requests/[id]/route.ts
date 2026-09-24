/**
 * PATCH /api/annual-actions/change-requests/[id]
 * SUPER_USER aprova ou rejeita uma solicitação.
 * Se aprovada e type=DELETE → deleta o registro.
 * Se aprovada e type=EDIT   → aplica editFields ao registro.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUser } from "@/lib/auth-helpers";

const patchSchema = z.object({
  decision:   z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApprovedUser();
  if (!user || user.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Apenas coordenadores podem revisar solicitações." }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const changeRequest = await prisma.changeRequest.findUnique({
    where: { id: params.id },
    include: { record: true },
  });
  if (!changeRequest) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
  if (changeRequest.status !== "PENDING") {
    return NextResponse.json({ error: "Solicitação já foi processada." }, { status: 422 });
  }

  // Atualiza o status da solicitação
  const updated = await prisma.changeRequest.update({
    where: { id: params.id },
    data: {
      status:      parsed.data.decision,
      reviewNote:  parsed.data.reviewNote ?? null,
      reviewedById: user.id,
      reviewedAt:  new Date(),
    },
  });

  // Se aprovada, executa a ação
  if (parsed.data.decision === "APPROVED") {
    if (changeRequest.type === "DELETE") {
      await prisma.activityRecord.delete({ where: { id: changeRequest.recordId } });
    } else if (changeRequest.type === "EDIT" && changeRequest.editFields) {
      let fields: Record<string, unknown> = {};
      try { fields = JSON.parse(changeRequest.editFields); } catch { /* ignore */ }
      await prisma.activityRecord.update({
        where: { id: changeRequest.recordId },
        data: { ...fields, activityStatus: "PENDING", ultimaEdicao: new Date() },
      });
    }
  }

  return NextResponse.json(updated);
}
