"use client";
/**
 * /admin/teams — Gestão de Equipes (SUPER_USER only)
 */
import React, { useEffect, useState, useCallback } from "react";

interface UserRow   { id: string; name: string | null; email: string; status: string; }
interface TeamMemberRow { id: string; userId: string; user: UserRow; }
interface Team      { id: string; nome: string; descricao?: string | null; membros: TeamMemberRow[]; }

const CL = {
  card:  "bg-white border border-[#D6E2EE] rounded-2xl shadow-sm p-5",
  input: "w-full border border-[#D6E2EE] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4F7A]/30",
  btn:   "px-4 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50",
};

export default function TeamsPage() {
  const [teams,       setTeams]       = useState<Team[]>([]);
  const [allUsers,    setAllUsers]    = useState<UserRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [creating,    setCreating]    = useState(false);
  const [newNome,     setNewNome]     = useState("");
  const [newDesc,     setNewDesc]     = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [tr, ur] = await Promise.all([fetch("/api/teams"), fetch("/api/whitelist")]);
    setTeams(await tr.json());
    const users: UserRow[] = await ur.json();
    setAllUsers(users.filter((u) => u.status === "APPROVED"));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createTeam() {
    if (!newNome.trim()) { setError("Informe o nome da equipe."); return; }
    setSaving(true); setError(null);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: newNome.trim(), descricao: newDesc.trim() || undefined }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Erro ao criar."); return; }
    setCreating(false); setNewNome(""); setNewDesc(""); load();
  }

  async function deleteTeam(id: string) {
    if (!confirm("Remover esta equipe? Os registros de atividades não serão afetados.")) return;
    await fetch(`/api/teams/${id}`, { method: "DELETE" });
    load();
  }

  async function toggleMember(teamId: string, userId: string, isMember: boolean) {
    await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isMember ? { removeMembers: [userId] } : { addMembers: [userId] }),
    });
    const res = await fetch("/api/teams");
    const teams: Team[] = await res.json();
    setTeams(teams);
    setEditingTeam(teams.find((t) => t.id === teamId) ?? null);
  }

  async function saveTeamName(teamId: string, nome: string, descricao: string) {
    setSaving(true);
    await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome.trim(), descricao: descricao.trim() || null }),
    });
    setSaving(false);
    load();
    setEditingTeam(null);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1C2B3A]">Gestão de Equipes</h1>
          <p className="text-sm text-[#5A7184] mt-1">Crie equipes e gerencie seus membros.</p>
        </div>
        <button
          onClick={() => { setCreating(true); setError(null); }}
          className={`${CL.btn} bg-[#1A4F7A] text-white hover:bg-[#0F3254]`}
        >
          + Nova equipe
        </button>
      </div>

      {/* Formulário de criação */}
      {creating && (
        <div className={CL.card}>
          <h2 className="font-bold text-[#1C2B3A] mb-3">Nova equipe</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Nome *</label>
              <input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Ex.: Lilian e Antônio" className={CL.input} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Descrição (opcional)</label>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Área de atuação..." className={CL.input} />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button onClick={createTeam} disabled={saving} className={`${CL.btn} bg-[#1A4F7A] text-white hover:bg-[#0F3254]`}>
                {saving ? "Salvando…" : "Criar"}
              </button>
              <button onClick={() => { setCreating(false); setError(null); }} className={`${CL.btn} border border-[#D6E2EE] text-[#1C2B3A]`}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#5A7184]">Carregando…</p>
      ) : teams.length === 0 ? (
        <div className={`${CL.card} text-center text-[#5A7184] py-10`}>
          Nenhuma equipe criada ainda. Clique em "+ Nova equipe" para começar.
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div key={team.id} className={CL.card}>
              {editingTeam?.id === team.id ? (
                <EditTeamPanel
                  team={editingTeam}
                  allUsers={allUsers}
                  saving={saving}
                  onSaveName={saveTeamName}
                  onToggleMember={toggleMember}
                  onClose={() => setEditingTeam(null)}
                />
              ) : (
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="font-bold text-[#1C2B3A]">{team.nome}</h2>
                    {team.descricao && <p className="text-xs text-[#5A7184] mt-0.5">{team.descricao}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {team.membros.length === 0
                        ? <span className="text-xs text-[#5A7184]">Sem membros</span>
                        : team.membros.map((m) => (
                          <span key={m.id} className="bg-[#E8F1F8] text-[#1A4F7A] text-xs px-2 py-0.5 rounded-full">
                            {m.user.name ?? m.user.email}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setEditingTeam(team)}
                      className={`${CL.btn} bg-[#E8F1F8] text-[#1A4F7A]`}
                    >Editar</button>
                    <button
                      onClick={() => deleteTeam(team.id)}
                      className={`${CL.btn} bg-[#FDEAEA] text-[#A13B3B]`}
                    >Remover</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ─── Painel de edição inline ──────────────────────────────────────────────────
function EditTeamPanel({
  team, allUsers, saving,
  onSaveName, onToggleMember, onClose,
}: {
  team: Team; allUsers: UserRow[]; saving: boolean;
  onSaveName: (id: string, nome: string, desc: string) => void;
  onToggleMember: (teamId: string, userId: string, isMember: boolean) => void;
  onClose: () => void;
}) {
  const [nome, setNome]   = useState(team.nome);
  const [desc, setDesc]   = useState(team.descricao ?? "");
  const memberIds = new Set(team.membros.map((m) => m.userId));

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-[#1C2B3A]">Editar equipe</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">Nome *</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={CL.input} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Descrição</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} className={CL.input} />
        </div>
      </div>

      {/* Membros */}
      <div>
        <p className="text-xs font-semibold mb-2 text-[#1C2B3A]">Membros (usuários aprovados)</p>
        <div className="border border-[#D6E2EE] rounded-xl divide-y max-h-64 overflow-y-auto">
          {allUsers.length === 0
            ? <p className="text-xs text-[#5A7184] p-3">Nenhum usuário aprovado.</p>
            : allUsers.map((u) => {
              const isMember = memberIds.has(u.id);
              return (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[#F5F7FA]">
                  <input
                    type="checkbox"
                    checked={isMember}
                    onChange={() => onToggleMember(team.id, u.id, isMember)}
                    className="rounded"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1C2B3A] truncate">{u.name ?? "(sem nome)"}</p>
                    <p className="text-xs text-[#5A7184] truncate">{u.email}</p>
                  </div>
                  {isMember && <span className="ml-auto bg-[#E7F6EF] text-[#1B7F5A] text-xs px-2 py-0.5 rounded-full shrink-0">Membro</span>}
                </label>
              );
            })
          }
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSaveName(team.id, nome, desc)}
          disabled={saving}
          className={`${CL.btn} bg-[#1A4F7A] text-white hover:bg-[#0F3254]`}
        >{saving ? "Salvando…" : "Salvar"}</button>
        <button onClick={onClose} className={`${CL.btn} border border-[#D6E2EE] text-[#1C2B3A]`}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
