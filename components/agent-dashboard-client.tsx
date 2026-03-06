"use client";

import { useMemo, useState } from "react";
import { CompanyActivityPanel } from "@/components/company-activity-panel";
import { CompanyNextActionInput } from "@/components/company-next-action-input";
import { CompanyPrioritySelect } from "@/components/company-priority-select";
import { CompanyStatusSelect } from "@/components/company-status-select";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import {
  COMPANY_PRIORITIES,
  COMPANY_STATUSES,
  type CompanyPriority,
  type CompanyStatus,
} from "@/lib/types";

type CompanyRow = {
  id: string;
  name: string;
  rfc: string;
  status: CompanyStatus;
  priority: CompanyPriority;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  companies: CompanyRow[];
};

function isStale(company: CompanyRow): boolean {
  const baseDate = company.next_action_at ?? company.updated_at;
  const days = (Date.now() - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24);
  return days >= 7;
}

export function AgentDashboardClient({ companies }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showStale, setShowStale] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    companies[0]?.id ?? null
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return companies.filter((company) => {
      const byQuery =
        normalizedQuery.length === 0 ||
        company.name.toLowerCase().includes(normalizedQuery) ||
        company.rfc.toLowerCase().includes(normalizedQuery);

      const byStatus = statusFilter === "all" || company.status === statusFilter;
      const byPriority =
        priorityFilter === "all" || company.priority === priorityFilter;
      const byStale = !showStale || isStale(company);

      return byQuery && byStatus && byPriority && byStale;
    });
  }, [companies, priorityFilter, query, showStale, statusFilter]);

  const kpis = useMemo(() => {
    const total = companies.length;
    const stale = companies.filter(isStale).length;
    const high = companies.filter((item) => item.priority === "high").length;
    const clients = companies.filter((item) => item.status === "client").length;

    return { total, stale, high, clients };
  }, [companies]);

  const selected = filtered.find((item) => item.id === selectedCompanyId) ?? filtered[0];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard title="Empresas" value={kpis.total} helper="Total asignadas" />
        <MetricCard title="Alta prioridad" value={kpis.high} helper="Requieren foco" />
        <MetricCard title="Sin movimiento" value={kpis.stale} helper=">= 7 dias" />
        <MetricCard title="Clientes" value={kpis.clients} helper="Cierre logrado" />
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por empresa o RFC"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize"
        >
          <option value="all">Todos los estados</option>
          {COMPANY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize"
        >
          <option value="all">Todas las prioridades</option>
          {COMPANY_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showStale}
            onChange={(event) => setShowStale(event.target.checked)}
            className="h-4 w-4"
          />
          Solo sin movimiento (7+ dias)
        </label>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Empresa</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">RFC</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Prioridad</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Proxima accion</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actualizar</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actividad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((company) => (
              <tr key={company.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{company.name}</p>
                  <p className="text-xs text-slate-500">
                    {isStale(company) ? "Sin movimiento" : "Activa"}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-700">{company.rfc}</td>
                <td className="space-y-2 px-4 py-3">
                  <StatusBadge status={company.status} />
                  <CompanyStatusSelect
                    companyId={company.id}
                    initialStatus={company.status}
                  />
                </td>
                <td className="space-y-2 px-4 py-3">
                  <PriorityBadge priority={company.priority} />
                  <CompanyPrioritySelect
                    companyId={company.id}
                    initialPriority={company.priority}
                  />
                </td>
                <td className="px-4 py-3">
                  <CompanyNextActionInput
                    companyId={company.id}
                    initialValue={company.next_action_at}
                  />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  <p>Alta: {new Date(company.created_at).toLocaleDateString()}</p>
                  <p>Update: {new Date(company.updated_at).toLocaleDateString()}</p>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedCompanyId(company.id)}
                    className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Ver historial
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No hay resultados con los filtros actuales.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      {selected ? (
        <CompanyActivityPanel companyId={selected.id} companyName={selected.name} />
      ) : null}
    </div>
  );
}

function MetricCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: number;
  helper: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </article>
  );
}
