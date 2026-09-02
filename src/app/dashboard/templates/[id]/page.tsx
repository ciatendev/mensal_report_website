import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DynamicForm from "@/components/DynamicForm";

interface Props {
  params: { id: string };
}

export default async function FillTemplatePage({ params }: Props) {
  const template = await prisma.template.findUnique({
    where: { id: params.id, isActive: true },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!template) notFound();

  const formattedTemplate = {
    id: template.id,
    title: template.title,
    description: template.description,
    questions: template.questions.map((q) => ({
      id: q.id,
      order: q.order,
      label: q.label,
      type: q.type,
      isRequired: q.isRequired,
      isRepeatable: q.isRepeatable,
      defaultRowText: q.defaultRowText,
      options: (q.options as string[] | null) ?? undefined,
    })),
  };

  return (
    <main className="px-4 py-10">
      <DynamicForm template={formattedTemplate} />
    </main>
  );
}