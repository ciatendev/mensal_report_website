import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUser } from "@/lib/auth-helpers";
import {
  deliverSubmission,
  validateSubmissionAnswers,
  type SubmissionAnswerInput,
} from "@/lib/submission-service";

const submissionSchema = z.object({
  templateId: z.string().min(1),
  submittedByName: z.string().trim().min(2).max(160),
  reportMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    value: z.string().max(100_000),
  })).min(1),
  signatureBase64: z.string().startsWith("data:image/"),
  signatureSource: z.enum(["DRAWN", "UPLOADED"]),
});

function getClientIp(req: NextRequest): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  try {
    const user = await getApprovedUser();
    if (!user) {
      return NextResponse.json({ error: "Sessão inválida ou expirada. Faça login novamente." }, { status: 401 });
    }

    const parsed = submissionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }

    const { templateId, submittedByName, reportMonth, answers, signatureBase64, signatureSource } = parsed.data;
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!template || !template.isActive) {
      return NextResponse.json({ error: "Modelo de formulário não encontrado ou inativo." }, { status: 404 });
    }

    const validationError = validateSubmissionAnswers(template.questions, answers as SubmissionAnswerInput[]);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const submission = await prisma.submission.create({
      data: {
        templateId: template.id,
        submittedById: user.id,
        submittedByName: submittedByName.trim(),
        reportMonth,
        signatureBase64,
        signatureSource,
        ipAddress: getClientIp(req),
        answers: { create: answers.map((answer) => ({ questionId: answer.questionId, value: answer.value })) },
      },
      select: { id: true },
    });

    try {
      const delivery = await deliverSubmission(submission.id);
      return NextResponse.json({
        success: true,
        submissionId: submission.id,
        emailSent: delivery.emailSent,
        deliveryError: delivery.emailSent ? undefined : delivery.error,
      }, { status: 201 });
    } catch (deliveryError) {
      const message = deliveryError instanceof Error ? deliveryError.message : "Falha ao gerar ou enviar o PDF.";
      return NextResponse.json({
        success: false,
        submissionId: submission.id,
        emailSent: false,
        error: message,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[POST /api/submissions] Erro:", error);
    return NextResponse.json({ error: "Erro interno ao processar a submissão." }, { status: 500 });
  }
}

export async function GET() {
  const user = await getApprovedUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const submissions = await prisma.submission.findMany({
    where: user.role === "SUPER_USER" ? undefined : { submittedById: user.id },
    include: {
      template: { select: { title: true } },
      submittedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(submissions);
}
