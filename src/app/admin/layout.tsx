import Link from "next/link";
import { signOut } from "@/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin/templates" className="font-semibold text-gray-900">
            Painel Admin
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/templates" className="text-gray-600 hover:text-primary">
              Modelos
            </Link>
            <Link href="/admin/whitelist" className="text-gray-600 hover:text-primary">
              Gestão de Usuários
            </Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-primary">
              Ver como Bolsista
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-red-600 hover:underline font-medium"
              >
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
