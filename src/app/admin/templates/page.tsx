export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminTemplatesPage() {
  const templates = await prisma.template.findMany({
    include: { _count: { select: { submissions: true, questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Modelos de Formulário
          </h1>
          <p className="text-gray-500 text-sm">
            Gerencie os modelos disponíveis para preenchimento.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/templates/new"
            className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-dark"
          >
            + Novo Modelo
          </Link>
        </div>
      </header>

      <div className="bg-white rounded-lg border divide-y">
        {templates.map((t) => (
          <Link
            key={t.id}
            href={`/admin/templates/${t.id}/edit`}
            className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div>
              <p className="font-medium text-gray-900">{t.title}</p>
              <p className="text-xs text-gray-500">
                {t._count.questions} perguntas · {t._count.submissions} envios
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                t.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {t.isActive ? "Ativo" : "Inativo"}
            </span>
          </Link>
        ))}

        {templates.length === 0 && (
          <p className="p-6 text-sm text-gray-500 text-center">
            Nenhum modelo criado ainda.
          </p>
        )}
      </div>
    </main>
  );
}