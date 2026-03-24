/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { onCompanyActivityUpdated } from "@/lib/company-activity-events";
import { ACTIVITY_TYPES, type ActivityType, type CompanyActivity } from "@/lib/types";

type Props = {
  companyId: string;
  companyName: string;
};

function activityLabel(type: ActivityType): string {
  return type.replace("_", " ");
}

export function CompanyActivityPanel({ companyId, companyName }: Props) {
  const [activities, setActivities] = useState<CompanyActivity[]>([]);
  const [type, setType] = useState<ActivityType>("note");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    const response = await fetch(`/api/companies/${companyId}/activities`, {
      cache: "no-store",
    });

    if (!response.ok) {
      setError("No se pudo cargar el historial.");
      return;
    }

    const payload = (await response.json()) as { data: CompanyActivity[] };
    setActivities(payload.data ?? []);
  }, [companyId]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    return onCompanyActivityUpdated((updatedCompanyId) => {
      if (updatedCompanyId === companyId) {
        void loadActivities();
      }
    });
  }, [companyId, loadActivities]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("Agrega un comentario.");
      return;
    }

    setLoading(true);

    const response = await fetch(`/api/companies/${companyId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "No se pudo guardar la actividad");
      return;
    }

    setContent("");
    await loadActivities();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Actividad - {companyName}</h3>
      <button
        onClick={() => void loadActivities()}
        className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
      >
        Actualizar historial
      </button>

      <form onSubmit={onSubmit} className="mt-3 grid gap-3 md:grid-cols-[160px_1fr_auto]">
        <select
          value={type}
          onChange={(event) => setType(event.target.value as ActivityType)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize"
        >
          {ACTIVITY_TYPES.map((item) => (
            <option key={item} value={item}>
              {activityLabel(item)}
            </option>
          ))}
        </select>

        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Ejemplo: Se llamo a compras y pidieron propuesta"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <button
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Agregar"}
        </button>
      </form>

      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

      <ul className="mt-4 space-y-2">
        {activities.map((activity) => (
          <li key={activity.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-semibold capitalize">{activityLabel(activity.type)}</span>
              <span>{new Date(activity.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{activity.content}</p>
            <p className="mt-1 text-xs text-slate-500">
              Por {(activity.users?.[0]?.name ?? "Usuario")}
            </p>
          </li>
        ))}

        {activities.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No hay actividad registrada para esta empresa.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
