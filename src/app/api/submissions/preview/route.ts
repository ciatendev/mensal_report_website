import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApprovedUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { generateReportPdf } from "@/lib/puppeteer";
import { buildPdfAnswers, validateSubmissionAnswers, type SubmissionAnswerInput } from "@/lib/submission-service";

const previewSchema = z.object({
  templateId: z.string().min(1),
  submittedByName: z.string().trim().min(2).max(160),
  reportMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  answers: z.array(z.object({ questionId: z.string().min(1), value: z.string().max(100_000) })).min(1),
  signatureBase64: z.string().startsWith("data:image/"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getApprovedUser();
    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const parsed = previewSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });

    const template = await prisma.template.findUnique({
      where: { id: parsed.data.templateId, isActive: true },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!template) return NextResponse.json({ error: "Modelo não encontrado ou inativo." }, { status: 404 });

    const answers = parsed.data.answers as SubmissionAnswerInput[];
    const validationError = validateSubmissionAnswers(template.questions, answers);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const pdfBuffer = await generateReportPdf({
      templateTitle: template.title,
      templateDescription: template.description,
      submittedByName: parsed.data.submittedByName,
      reportMonth: parsed.data.reportMonth,
      submittedByEmail: user.email ?? "",
      submittedAt: new Date().toISOString(),
      answers: buildPdfAnswers(template.questions, answers),
      signatureBase64: parsed.data.signatureBase64,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=relatorio-preview.pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[POST /api/submissions/preview] Erro:", error);
    return NextResponse.json({ error: "Não foi possível gerar a pré-visualização." }, { status: 500 });
  }
}
