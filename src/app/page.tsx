import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    if (session.user.status === "APPROVED") {
      redirect("/menuServicePage");
    } else {
      redirect("/pending-approval");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-8 text-center">
        <img
          src="/ciaten-logo.png"
          alt="CIATEN"
          className="h-10 mx-auto mb-6"
        />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Sistema de Relatórios
        </h1>
        <p className="text-gray-500 mb-8">
          Faça login com sua conta Google para continuar.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/menuServicePage" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-md py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Entrar com Google
          </button>
        </form>
      </div>
    </main>
  );
}