import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/auth-helpers";
import { deliverSubmission } from "@/lib/submission-service";
import { prisma } from "@/lib/prisma";

interface Params { params: { id: string } }

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await getApprovedUser();
    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const submission = await prisma.submission.findUnique({ where: { id: params.id }, select: { submittedById: true } });
    if (!submission) return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 });
    if (user.role !== "SUPER_USER" && submission.submittedById !== user.id) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const delivery = await deliverSubmission(params.id);
    return NextResponse.json({
      success: delivery.emailSent,
      submissionId: params.id,
      emailSent: delivery.emailSent,
      error: delivery.emailSent ? undefined : delivery.error,
    }, { status: delivery.emailSent ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao reenviar o relatório.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
