import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

interface Params { params: { id: string } }

export async function POST(_request: Request, { params }: Params) {
  const user = await getApprovedUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const submission = await prisma.submission.findUnique({ where: { id: params.id }, select: { submittedById: true } });
  if (!submission) return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 });
  if (user.role !== "SUPER_USER" && submission.submittedById !== user.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const queued = await prisma.submission.update({
    where: { id: params.id },
    data: { deliveryStatus: "QUEUED", queuedAt: new Date() },
    select: { id: true, deliveryStatus: true, queuedAt: true },
  });
  return NextResponse.json({ success: true, submission: queued });
}
