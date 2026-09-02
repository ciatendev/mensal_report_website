import { NextRequest, NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getApprovedUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const template = await prisma.template.findUnique({
    where: { id: params.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!template) {
    return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getApprovedUser();
  if (!user || user.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json();

  const template = await prisma.template.update({
    where: { id: params.id },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    },
  });

  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getApprovedUser();
  if (!user || user.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const template = await prisma.template.findUnique({
    where: { id: params.id },
    select: { id: true, _count: { select: { submissions: true } } },
  });

  if (!template) {
    return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
  }

  if (template._count.submissions > 0) {
    // Não apaga: só desativa, preservando o histórico de submissões.
    await prisma.template.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json(
      {
        deleted: false,
        deactivated: true,
        error: `Este modelo já tem ${template._count.submissions} submissão(ões) registrada(s) e não pode ser excluído — foi apenas desativado para preservar o histórico.`,
      },
      { status: 409 }
    );
  }

  await prisma.template.delete({ where: { id: params.id } });

  return NextResponse.json({ deleted: true, deactivated: false });
}