import Link from "next/link"

export default async function menuServicePage() {

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-8 text-center">
        <img
          src="/ciaten-logo.png"
          alt="CIATEN"
          className="h-10 mx-auto mb-6"
        />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ciaten
        </h1>
        <p className="text-gray-500 mb-8">
          Escolha o serviço que deseja usar.
        </p>

        <div className="space-y-3">
        <Link href="/dashboard" className="w-full">
          <button type="button" className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-md py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition"> 
            Relatórios mensais
          </button>
        </Link>

        <Link href="/annualActionsReport" className="w-full">
          <button type="button" className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-md py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition"> 
            Registro de Atividades 
          </button>
        </Link>
      </div>

      </div>
    </main>
  );
}