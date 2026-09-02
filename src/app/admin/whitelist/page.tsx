"use client";

import { useEffect, useState } from "react";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "SUPER_USER";
  status: "PENDING" | "APPROVED" | "BLOCKED";
}

export default function WhitelistPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/whitelist");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function conversionState(state: UserRow) {
    switch(state.status)
    {
      case "PENDING":
        return "Pendente";
      case "APPROVED":
        return "Aprovado";
      default:
        return "Bloqueado";
    }
  }

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

  const statusStyles: Record<UserRow["status"], string> = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    BLOCKED: "bg-red-100 text-red-700",
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Gestão de Usuários 
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Aprove, bloqueie ou promova usuários que podem acessar o sistema.
      </p>

      <form onSubmit={preRegister} className="flex gap-2 mb-8">
        <input
          type="email"
          placeholder="Pré-aprovar um e-mail (ex: novo@empresa.com)"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <button className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-dark">
          Pré-aprovar
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {users.map((u) => (
            <div key={u.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">
                  {u.name ?? "(sem login ainda)"}
                </p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[u.status]}`}
                >
                  {/** Converte o status do usuário */}
                  {conversionState(u)} 
                </span>

                <select
                  value={u.status}
                  onChange={(e) =>
                    updateUser(u.id, { status: e.target.value as UserRow["status"] })
                  }
                  className="text-xs border rounded-md px-2 py-1"
                >
                  <option value="PENDING">Pendente</option>
                  <option value="APPROVED">Aprovar</option>
                  <option value="BLOCKED">Remover</option>
                </select>

                <select
                  value={u.role}
                  onChange={(e) =>
                    updateUser(u.id, { role: e.target.value as UserRow["role"] })
                  }
                  className="text-xs border rounded-md px-2 py-1"
                >
                  <option value="USER">Usuário</option>
                  <option value="SUPER_USER">Administrador</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
