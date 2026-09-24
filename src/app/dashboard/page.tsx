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
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Topbar */}
      <header className="bg-white border-b border-[#D6E2EE] shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/ciaten-logo.png" alt="CIATEN" className="h-9 w-9 object-contain" />
            <div>
              <p className="text-sm font-bold text-[#1A4F7A] leading-none">CIATEN</p>
              <p className="text-xs text-[#5A7184]">Relatórios Mensais</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/menuServicePage" className="text-sm text-[#5A7184] hover:text-[#1A4F7A] transition-colors">
              Menu
            </Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button className="text-sm font-semibold text-[#A13B3B] hover:underline">Sair</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1C2B3A]">
            Olá, {session?.user?.name?.split(" ")[0]} 
          </h1>
          <p className="text-[#5A7184] text-sm mt-1">Selecione um formulário para preencher e assinar.</p>
        </div>

        <div className="grid gap-3">
          {templates.length === 0 && (
            <div className="bg-white border border-[#D6E2EE] rounded-2xl p-8 text-center">
              <p className="text-[#5A7184] text-sm">Nenhum modelo de formulário disponível no momento.</p>
            </div>
          )}
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/templates/${t.id}`}
              className="block bg-white border border-[#D6E2EE] rounded-2xl p-5 hover:border-[#1A4F7A] hover:shadow-[0_4px_20px_rgba(26,79,122,0.10)] transition-all duration-200 group"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[#1C2B3A] group-hover:text-[#1A4F7A] transition-colors">
                    {t.title}
                  </h2>
                  {t.description && (
                    <p className="text-sm text-[#5A7184] mt-1">{t.description}</p>
                  )}
                </div>
                <span className="text-[#D6E2EE] group-hover:text-[#1A4F7A] transition-colors text-xl shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>

        <PendingReportsPanel />
      </main>
    </div>
  );
}
