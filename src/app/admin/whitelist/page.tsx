"use client";
/**
 * /admin/whitelist — Gestão de Usuários + Gestão de Equipes (em abas)
 */
import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "SUPER_USER";
  status: "PENDING" | "APPROVED" | "BLOCKED";
}
interface TeamMemberRow { id: string; userId: string; user: UserRow; }
interface Team { id: string; nome: string; descricao?: string | null; membros: TeamMemberRow[]; }

// ─── Shared styles ────────────────────────────────────────────────────────────
const CL = {
  card:  "bg-white border border-[#D6E2EE] rounded-2xl shadow-sm",
  input: "w-full border border-[#D6E2EE] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4F7A]/30",
  btn:   "px-4 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50",
};

const statusStyles: Record<UserRow["status"], string> = {
  APPROVED: "bg-green-100 text-green-700",
  PENDING:  "bg-yellow-100 text-yellow-700",
  BLOCKED:  "bg-red-100 text-red-700",
};
const statusLabel: Record<UserRow["status"], string> = {
  APPROVED: "Aprovado",
  PENDING:  "Pendente",
  BLOCKED:  "Bloqueado",
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WhitelistPage() {
  const [tab, setTab] = useState<"users" | "teams">("users");

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1C2B3A]">Gestão de Usuários e Equipes</h1>
        <p className="text-[#5A7184] text-sm mt-1">Gerencie acessos, funções e equipes do sistema.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#D6E2EE] pb-1">
        {(["users","teams"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition ${tab === t ? "bg-[#1A4F7A] text-white" : "text-[#5A7184] hover:text-[#1A4F7A]"}`}
          >
            {t === "users" ? "Usuários" : "Equipes"}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersPanel />}
      {tab === "teams" && <TeamsPanel />}
    </main>
  );
}

// ─── Painel de Usuários ───────────────────────────────────────────────────────
function UsersPanel() {
  const [users,    setUsers]    = useState<UserRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [search,   setSearch]   = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/whitelist");
      const data = res.ok ? await res.json() : [];
      setUsers(data);
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function updateUser(userId: string, patch: Partial<UserRow>) {
    await fetch("/api/whitelist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    loadUsers();
  }

  async function preRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    await fetch("/api/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim() }),
    });
    setNewEmail("");
    loadUsers();
  }

  // Filtro por nome ou email
  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Barra de busca */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A7184] text-sm">🔍</span>
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-[#D6E2EE] rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4F7A]/30"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A7184] hover:text-[#1C2B3A] text-xs">✕</button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-[#5A7184]">Carregando...</p>
      ) : (
        <>
          {search && (
            <p className="text-xs text-[#5A7184]">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para &quot;{search}&quot;
            </p>
          )}
          <div className={`${CL.card} divide-y divide-[#D6E2EE]`}>
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#5A7184]">
                {search ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado."}
              </p>
            ) : filtered.map((u) => (
              <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#1C2B3A] truncate">{u.name ?? "(sem login ainda)"}</p>
                  <p className="text-xs text-[#5A7184] truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[u.status]}`}>
                    {statusLabel[u.status]}
                  </span>
                  <select
                    value={u.status}
                    onChange={(e) => updateUser(u.id, { status: e.target.value as UserRow["status"] })}
                    className="text-xs border border-[#D6E2EE] rounded-lg px-2 py-1"
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="APPROVED">Aprovar</option>
                    <option value="BLOCKED">Bloquear</option>
                  </select>
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value as UserRow["role"] })}
                    className="text-xs border border-[#D6E2EE] rounded-lg px-2 py-1"
                  >
                    <option value="USER">Usuário</option>
                    <option value="SUPER_USER">Administrador</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Painel de Equipes ────────────────────────────────────────────────────────
function TeamsPanel() {
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
    try {
      const [tr, ur] = await Promise.all([fetch("/api/teams"), fetch("/api/whitelist")]);
      const teamsData: Team[] = tr.ok ? await tr.json() : [];
      const usersData: UserRow[] = ur.ok ? await ur.json() : [];
      setTeams(teamsData);
      setAllUsers(usersData.filter((u) => u.status === "APPROVED"));
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createTeam() {
    if (!newNome.trim()) { setError("Informe o nome da equipe."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: newNome.trim(), descricao: newDesc.trim() || undefined }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = `Erro ${res.status}`;
        try { msg = JSON.parse(text).error ?? msg; } catch { msg = text.slice(0, 200) || msg; }
        setError(msg); setSaving(false); return;
      }
      setCreating(false); setNewNome(""); setNewDesc(""); load();
    } catch (e) {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
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
    const updated: Team[] = await res.json();
    setTeams(updated);
    setEditingTeam(updated.find((t) => t.id === teamId) ?? null);
  }

  async function saveTeamName(teamId: string, nome: string, desc: string) {
    setSaving(true);
    await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome.trim(), descricao: desc.trim() || null }),
    });
    setSaving(false);
    load();
    setEditingTeam(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => { setCreating(true); setError(null); }}
          className={`${CL.btn} bg-[#1A4F7A] text-white hover:bg-[#0F3254]`}
        >
          + Nova equipe
        </button>
      </div>

      {creating && (
        <div className={`${CL.card} p-5`}>
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
        <div className={`${CL.card} p-10 text-center text-[#5A7184] text-sm`}>
          Nenhuma equipe criada ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div key={team.id} className={`${CL.card} p-5`}>
              {editingTeam?.id === team.id ? (
                <EditTeamPanel team={editingTeam} allUsers={allUsers} saving={saving}
                  onSaveName={saveTeamName} onToggleMember={toggleMember}
                  onClose={() => setEditingTeam(null)} />
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
                    <button onClick={() => setEditingTeam(team)} className={`${CL.btn} bg-[#E8F1F8] text-[#1A4F7A]`}>Editar</button>
                    <button onClick={() => deleteTeam(team.id)} className={`${CL.btn} bg-[#FDEAEA] text-[#A13B3B]`}>Remover</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Painel de edição de equipe ───────────────────────────────────────────────
function EditTeamPanel({ team, allUsers, saving, onSaveName, onToggleMember, onClose }: {
  team: Team; allUsers: UserRow[]; saving: boolean;
  onSaveName: (id: string, nome: string, desc: string) => void;
  onToggleMember: (teamId: string, userId: string, isMember: boolean) => void;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(team.nome);
  const [desc, setDesc] = useState(team.descricao ?? "");
  const [search, setSearch] = useState("");
  const memberIds = new Set(team.membros.map((m) => m.userId));

  const filtered = allUsers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q);
  });

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

      <div>
        <p className="text-xs font-semibold mb-2 text-[#1C2B3A]">Membros (usuários aprovados)</p>
        <div className="relative mb-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A7184] text-xs">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-[#D6E2EE] rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A4F7A]/30"
          />
        </div>
        <div className="border border-[#D6E2EE] rounded-xl divide-y max-h-64 overflow-y-auto">
          {filtered.length === 0
            ? <p className="text-xs text-[#5A7184] p-3">Nenhum usuário encontrado.</p>
            : filtered.map((u) => {
              const isMember = memberIds.has(u.id);
              return (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[#F5F7FA]">
                  <input type="checkbox" checked={isMember}
                    onChange={() => onToggleMember(team.id, u.id, isMember)} className="rounded" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1C2B3A] truncate">{u.name ?? "(sem nome)"}</p>
                    <p className="text-xs text-[#5A7184] truncate">{u.email}</p>
                  </div>
                  {isMember && <span className="bg-[#E7F6EF] text-[#1B7F5A] text-xs px-2 py-0.5 rounded-full shrink-0">Membro</span>}
                </label>
              );
            })
          }
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onSaveName(team.id, nome, desc)} disabled={saving}
          className={`${CL.btn} bg-[#1A4F7A] text-white hover:bg-[#0F3254]`}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button onClick={onClose} className={`${CL.btn} border border-[#D6E2EE] text-[#1C2B3A]`}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
