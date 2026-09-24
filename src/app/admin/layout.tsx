import Link from "next/link";
import { signOut } from "@/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="bg-[#1A4F7A] text-white sticky top-0 z-10 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/templates" className="font-bold text-white hover:text-[#E8F1F8] transition-colors">
              Painel Admin
            </Link>
          </div>
          <nav className="flex items-center gap-1 text-sm flex-wrap">
            {[
              { href: "/admin/templates", label: "Modelos" },
              { href: "/admin/whitelist", label: "Usuários" },
              { href: "/menuServicePage", label: "Menu"}
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors font-medium"
              >
                {l.label}
              </Link>
            ))}
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button className="px-3 py-1.5 rounded-lg bg-[#FDEAEA] text-[#A13B3B] font-semibold hover:bg-white transition-colors text-sm ml-1">
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
