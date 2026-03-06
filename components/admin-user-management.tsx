"use client";

import { type FormEvent, useState } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  is_active: boolean;
  created_at: string;
};

type Props = {
  initialUsers: UserRow[];
};

export function AdminUserManagement({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createAgent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: password || undefined, role: "agent" }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "No se pudo crear el usuario");
      return;
    }

    const reload = await fetch("/api/admin/users", { cache: "no-store" });
    if (reload.ok) {
      const payload = (await reload.json()) as { data: UserRow[] };
      setUsers(payload.data ?? []);
    }

    setName("");
    setEmail("");
    setPassword("");
  };

  const toggleActive = async (id: string, nextActive: boolean) => {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: nextActive }),
    });

    if (!response.ok) return;
    setUsers((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_active: nextActive } : item
      )
    );
  };

  const deleteUser = async (id: string) => {
    const confirmed = window.confirm("Eliminar usuario de forma permanente?");
    if (!confirmed) return;

    const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setUsers((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Gestion de usuarios</h2>
        <p className="text-sm text-slate-600">Alta, activacion/desactivacion y eliminacion de agentes.</p>
      </div>

      <form onSubmit={createAgent} className="grid gap-3 md:grid-cols-4">
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password opcional"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Crear agente
        </button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Nombre</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Email</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Rol</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Estado</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2 text-slate-900">{item.name}</td>
                <td className="px-3 py-2 text-slate-700">{item.email}</td>
                <td className="px-3 py-2 text-slate-700 capitalize">{item.role}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
                  >
                    {item.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="space-x-2 px-3 py-2">
                  <button
                    onClick={() => toggleActive(item.id, !item.is_active)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {item.is_active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() => deleteUser(item.id)}
                    className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
