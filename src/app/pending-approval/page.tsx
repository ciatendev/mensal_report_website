import { signOut } from "@/auth";

export default function PendingApprovalPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const blocked = searchParams.reason === "blocked";

  // Usuário não autorizado ou na lista de espera
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 text-center">
        <div className="text-4xl mb-4">{blocked ? "🚫" : "⏳"}</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {blocked ? "Acesso Bloqueado" : "Aguardando Aprovação"}
        </h1>
        <p className="text-gray-500 mb-6">
          {blocked
            ? "Seu acesso a este sistema foi bloqueado pelo administrador."
            : "Seu cadastro foi recebido, mas ainda não foi aprovado pelo administrador. Assim que for liberado, você poderá acessar o sistema normalmente."}
        </p>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-primary hover:underline font-medium"
          >
            Sair e tentar novamente
          </button>
        </form>
      </div>
    </main>
  );
}
