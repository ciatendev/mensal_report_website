import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "CIATEN — Sistema de Gestão",
  description: "Sistema de Relatórios e Registro de Resultados do CIATEN",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#F5F7FA] text-[#1C2B3A] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
