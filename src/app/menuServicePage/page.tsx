import { auth } from "@/auth";
import Link from "next/link";

export default async function MenuServicePage() {
  const session = await auth();
  const isSuperUser = session?.user?.role === "SUPER_USER";

  const services = [
    {
      href:  "/dashboard",
      icon:  "📋",
      title: "Relatórios Mensais",
      desc:  "Preencha, assine e envie os relatórios mensais de atividades.",
      superOnly: false,
    },
    {
      href:  "/annualActionsReport",
      icon:  "📊",
      title: "Registro de Atividades",
      desc:  "Registre e acompanhe os resultados anuais do CIATEN.",
      superOnly: false,
    },
    {
      href:  "/admin/whitelist",
      icon:  "👥",
      title: "Gestão de Usuários",
      desc:  "Gerencie o acesso dos usuários ao sistema.",
      superOnly: true,
    },
  ].filter((s) => !s.superOnly || isSuperUser);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#F5F7FA]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(26,79,122,0.10)] p-8">
          <div className="flex items-center gap-4 mb-8">
            <img src="/ciaten-logo.png" alt="CIATEN" className="h-12 w-12 object-contain shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-[#1C2B3A] leading-tight">CIATEN</h1>
              <p className="text-[#5A7184] text-sm">Escolha o módulo que deseja acessar.</p>
            </div>
          </div>

          <div className="space-y-3">
            {services.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-start gap-4 p-4 rounded-xl border border-[#D6E2EE] bg-white hover:border-[#1A4F7A] hover:bg-[#E8F1F8] transition-all duration-200 group"
              >
                <span className="text-2xl mt-0.5 shrink-0">{s.icon}</span>
                <div>
                  <p className="font-semibold text-[#1C2B3A] group-hover:text-[#1A4F7A] transition-colors">
                    {s.title}
                  </p>
                  <p className="text-xs text-[#5A7184] mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
                <span className="ml-auto text-[#D6E2EE] group-hover:text-[#1A4F7A] transition-colors self-center text-lg">→</span>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-[#5A7184] mt-5">
          CIATEN — Centro de Inteligência em Agravos Tropicais e Emergentes e Negligenciadas
        </p>
      </div>
    </main>
  );
}
