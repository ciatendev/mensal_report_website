"use client";
import { signOut, useSession } from "next-auth/react";
import { useAnnualReport } from "./_hooks/useAnnualReport";
import { PageHeader } from "./_components/PageHeader";
import { TabRegistro } from "./_components/TabRegistro";
import {
  TabMeusRegistros, TabValidacao, TabResultadosEquipe,
  TabResultadosCiaten, ModalDetalhes,
} from "./_components/Tabs";
import { IndicadorKey } from "./forms/domain";

export default function AnnualActionsReportPage() {
  const r = useAnnualReport();
  const { data: session, status: sessionStatus } = useSession();
  const isSuperUser = sessionStatus === "authenticated" && session?.user?.role === "SUPER_USER";

  async function handleDelete(id: string) {
    const res = await fetch(`/api/annual-actions/records/${id}`, { method: "DELETE" });
    if (res.ok) await r.fetchMeus();
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans text-[#1C2B3A]">
      <PageHeader
        activeTab={r.activeTab}
        onTabChange={r.setActiveTab}
        onSignOut={() => signOut({ callbackUrl: "/" })}
      />
      <main className="max-w-5xl mx-auto px-4 pb-12">

        {r.activeTab === "registro" && (
          <TabRegistro
            editingId={r.editingId}
            isSuperUser={isSuperUser}
            userTeam={r.userTeam}
            dbEquipes={r.dbEquipes}
            equipeSel={r.equipeSel}           setEquipeSel={r.setEquipeSel}
            indicadorSel={r.indicadorSel}     setIndicadorSel={r.setIndicadorSel}
            nome={r.nome}                     setNome={r.setNome}
            tipo={r.tipo}                     setTipo={r.setTipo}
            status={r.status}                 setStatus={r.setStatus}
            evidencia={r.evidencia}           setEvidencia={r.setEvidencia}
            dataRealizacao={r.dataRealizacao} setDataRealizacao={r.setDataRealizacao}
            participantes={r.participantes}   setParticipantes={r.setParticipantes}
            canal={r.canal}                   setCanal={r.setCanal}
            alcance={r.alcance}               setAlcance={r.setAlcance}
            financiador={r.financiador}       setFinanciador={r.setFinanciador}
            valorAprovado={r.valorAprovado}   setValorAprovado={r.setValorAprovado}
            moeda={r.moeda}                   setMoeda={r.setMoeda}
            submitStatus={r.submitStatus}
            submitError={r.submitError}
            onSubmit={r.handleSubmit}
            onReset={r.resetForm}
          />
        )}

        {r.activeTab === "meus-registros" && (
          <TabMeusRegistros
            registros={r.meusRegistros}
            loadingData={r.loadingData}
            filtroEquipe={r.filtroEquipe}
            setFiltroEquipe={r.setFiltroEquipe}
            onEditar={r.preencherEdicao}
            onDelete={handleDelete}
            onRequestChange={async (recordId, type, nota) => {
              try { await r.requestChange(recordId, type, nota); }
              catch (e) { alert(e instanceof Error ? e.message : "Erro ao solicitar."); }
            }}
            isSuperUser={isSuperUser}
            userTeamNome={r.userTeam?.nome ?? null}
            dbEquipes={r.dbEquipes}
          />
        )}

        {r.activeTab === "validacao" && isSuperUser && (
          <TabValidacao
            pendentesList={r.pendentesList}
            historicoList={r.historicoList}
            loadingData={r.loadingData}
            openAjusteId={r.openAjusteId}
            setOpenAjusteId={r.setOpenAjusteId}
            ajusteTex={r.ajusteTex}
            setAjusteTex={r.setAjusteTex}
            ajusteError={r.ajusteError}
            setAjusteError={r.setAjusteError}
            onValidar={r.validarRegistro}
            changeRequests={r.changeRequests}
            onReviewChange={async (id, decision, note) => {
              try { await r.reviewChangeRequest(id, decision, note); }
              catch (e) { alert(e instanceof Error ? e.message : "Erro."); }
            }}
          />
        )}

        {r.activeTab === "resultados-equipe" && (
          <TabResultadosEquipe
            resumo={r.resumo}
            totais={r.totais}
            onOpenModal={(key: IndicadorKey, equipe: string) => r.setModalData({ key, equipe })}
            onExportCsv={r.exportTabela2Csv}
            onExportSheets={() => r.exportToSheets("tabela2")}
            sheetsStatus={r.sheetsExportStatus["tabela2"] ?? "idle"}
            sheetsError={r.sheetsExportError["tabela2"] ?? null}
            isSuperUser={isSuperUser}
            dbEquipes={r.dbEquipes}
          />
        )}

        {r.activeTab === "resultados-ciaten" && (
          <TabResultadosCiaten
            totais={r.totais}
            usdTotal={r.usdTotal}
            onOpenModal={(key: IndicadorKey, equipe: string) => r.setModalData({ key, equipe })}
            onExportCsv={r.exportTabela1Csv}
            onExportTabela2Csv={r.exportTabela2Csv}
            onExportRegistrosCsv={r.exportRegistrosCsv}
            onExportSheets={r.exportToSheets}
            sheetsExportStatus={r.sheetsExportStatus}
            sheetsExportError={r.sheetsExportError}
            isSuperUser={isSuperUser}
          />
        )}

        <ModalDetalhes
          modalData={r.modalData}
          registrosModal={r.registrosModal}
          onClose={() => r.setModalData(null)}
        />

        <footer className="text-center text-xs text-[#5A7184] mt-8 pt-4 border-t border-[#D6E2EE]">
          CIATEN — Sistema de Registro de Resultados {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  );
}
