import { signOut } from "@/auth";

export default function PendingApprovalPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const blocked = searchParams.reason === "blocked";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#F5F7FA]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(26,79,122,0.10)] p-8 text-center">
          <div className={`w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center text-3xl ${blocked ? "bg-[#FDEAEA]" : "bg-[#FFF4D6]"}`}>
            {blocked ? "🚫" : "⏳"}
          </div>
          <h1 className="text-xl font-bold text-[#1C2B3A] mb-2">
            {blocked ? "Acesso Bloqueado" : "Aguardando Aprovação"}
          </h1>
          <p className="text-[#5A7184] text-sm mb-8 leading-relaxed">
            {blocked
              ? "Seu acesso a este sistema foi bloqueado pelo administrador. Entre em contato para mais informações."
              : "Seu cadastro foi recebido. Assim que um administrador aprovar seu acesso, você poderá utilizar o sistema normalmente."}
          </p>

          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl border-2 border-[#D6E2EE] text-sm font-semibold text-[#1C2B3A] hover:border-[#1A4F7A] hover:bg-[#E8F1F8] transition-all"
            >
              Sair e tentar novamente
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
