import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUser } from "@/lib/auth-helpers";

const questionSchema = z.object({
  label: z.string().min(1),
  type: z.enum([
    "TEXT",
    "TEXTAREA",
    "NUMBER",
    "DATE",
    "SELECT",
    "CHECKBOX",
    "YES_NO_JUSTIFY",
  ]),
  isRequired: z.boolean().default(true),
  isRepeatable: z.boolean().default(false),
  defaultRowText: z.string().max(5000).optional(),
  order: z.number().default(0),
  options: z.array(z.string().trim().min(1)).max(100).optional(),
  fontSize: z.number().int().min(8).max(32).default(11),
  isBold: z.boolean().default(false),
  isItalic: z.boolean().default(false),
});

const templateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1),
});

export async function GET() {
  const user = await getApprovedUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const templates = await prisma.template.findMany({
    where: user.role === "SUPER_USER" ? undefined : { isActive: true },
    include: { questions: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const user = await getApprovedUser();
  if (!user || user.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { title, description, questions } = parsed.data;
  const invalidSelect = questions.find(
    (question) =>
      question.type === "SELECT" &&
      new Set((question.options ?? []).map((option) => option.trim()).filter(Boolean)).size === 0
  );
  if (invalidSelect) {
    return NextResponse.json(
      { error: `A pergunta "${invalidSelect.label}" precisa ter ao menos uma opção.` },
      { status: 400 }
    );
  }

  const normalizedQuestions = questions.map((question, index) => {
    const options = Array.from(
      new Set((question.options ?? []).map((option) => option.trim()).filter(Boolean))
    );

    return {
      ...question,
      order: question.order ?? index,
      options:
        question.type === "SELECT" || question.type === "CHECKBOX"
          ? options
          : undefined,
    };
  });

  const template = await prisma.template.create({
    data: {
      title,
      description,
      createdById: user.id,
      questions: {
        create: normalizedQuestions.map((q) => ({
          label: q.label,
          type: q.type,
          isRequired: q.isRequired,
          isRepeatable: q.isRepeatable,
          defaultRowText: q.defaultRowText ?? undefined,
          order: q.order,
          options: q.options ?? undefined,
          fontSize: q.fontSize,
          isBold: q.isBold,
          isItalic: q.isItalic,
        })),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json(template, { status: 201 });
}