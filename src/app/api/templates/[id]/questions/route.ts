import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApprovedUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

const questionSchema = z.object({
  // Presente = editar pergunta existente. Ausente = criar pergunta nova.
  id: z.string().optional(),
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

const syncSchema = z.object({
  questions: z.array(questionSchema).min(1),
});


export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getApprovedUser();
  if (!user || user.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const template = await prisma.template.findUnique({
    where: { id: params.id },
    include: { questions: true },
  });
  if (!template) {
    return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { questions } = parsed.data;
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

  const existingIds = new Set(template.questions.map((q) => q.id));
  const incomingIds = new Set(
    questions.filter((q) => q.id).map((q) => q.id as string)
  );

  const toDelete = template.questions.filter((q) => !incomingIds.has(q.id));

  const skipped: { id: string; label: string }[] = [];

  await prisma.$transaction(async (tx) => {
    // tenta remover as que saíram da lista
    for (const q of toDelete) {
      const answerCount = await tx.templateAnswer.count({
        where: { questionId: q.id },
      });
      if (answerCount > 0) {
        // Já tem respostas de submissões antigas, preserva a pergunta
        skipped.push({ id: q.id, label: q.label });
        continue;
      }
      await tx.templateQuestion.delete({ where: { id: q.id } });
    }

    // atualiza as existentes e cria as novas
    for (const [index, q] of questions.entries()) {
      const options = Array.from(
        new Set((q.options ?? []).map((option) => option.trim()).filter(Boolean))
      );
      const data = {
        label: q.label,
        type: q.type,
        isRequired: q.isRequired,
        isRepeatable: q.isRepeatable,
        defaultRowText: q.defaultRowText ?? undefined,
        order: q.order ?? index,
        options:
          q.type === "SELECT" || q.type === "CHECKBOX" ? options : undefined,
        fontSize: q.fontSize,
        isBold: q.isBold,
        isItalic: q.isItalic,
      };

      if (q.id && existingIds.has(q.id)) {
        await tx.templateQuestion.update({ where: { id: q.id }, data });
      } else {
        await tx.templateQuestion.create({
          data: { ...data, templateId: template.id },
        });
      }
    }
  });

  const updatedTemplate = await prisma.template.findUnique({
    where: { id: template.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ template: updatedTemplate, skipped });
}