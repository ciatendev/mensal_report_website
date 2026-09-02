import Link from "next/link";
import { auth, signOut } from "@/auth";
import PendingReportsPanel from "@/components/PendingReportsPanel";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();

  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {session?.user?.name?.split(" ")[0]}
          </h1>
          <p className="text-gray-500 text-sm">
            Selecione um formulário para preencher e assinar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {session?.user?.role === "SUPER_USER" && (
            <Link
              href="/admin/templates"
              className="text-sm font-medium text-primary hover:underline"
            >
              Área Admin
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="text-sm text-gray-500 hover:underline">
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="grid gap-4">
        {templates.length === 0 && (
          <p className="text-gray-500 text-sm">
            Nenhum modelo de formulário disponível no momento.
          </p>
        )}

        {templates.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/templates/${t.id}`}
            className="block bg-white border rounded-lg p-5 hover:shadow-md transition"
          >
            <h2 className="font-semibold text-gray-900">{t.title}</h2>
            {t.description && (
              <p className="text-sm text-gray-500 mt-1">{t.description}</p>
            )}
          </Link>
        ))}
      </div>

      <PendingReportsPanel />
    </main>
  );
}
