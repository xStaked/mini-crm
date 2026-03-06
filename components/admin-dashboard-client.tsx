"use client";

import { useMemo, useState } from "react";
import { CompanyActivityPanel } from "@/components/company-activity-panel";
import { CompanyNextActionInput } from "@/components/company-next-action-input";
import { CompanyPrioritySelect } from "@/components/company-priority-select";
import { CompanyStatusSelect } from "@/components/company-status-select";
import { PriorityBadge } from "@/components/priority-badge";
import { ReassignCompanySelect } from "@/components/reassign-company-select";
import { StatusBadge } from "@/components/status-badge";
import {
  COMPANY_PRIORITIES,
  COMPANY_STATUSES,
  type CompanyPriority,
  type CompanyStatus,
} from "@/lib/types";

type Agent = {
  id: string;
  name: string;
  email: string;
};

type CompanyWithAgent = {
  id: string;
  name: string;
  rfc: string;
  status: CompanyStatus;
  priority: CompanyPriority;
  created_at: string;
  updated_at: string;
  next_action_at: string | null;
  assigned_to: string;
  assigned_agent_name: string;
};

type Props = {
  companies: CompanyWithAgent[];
  agents: Agent[];
};

function isStale(company: CompanyWithAgent): boolean {
  const baseDate = company.next_action_at ?? company.updated_at;
  const days = (Date.now() - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24);
  return days >= 7;
}

export function AdminDashboardClient({ companies, agents }: Props) {
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    companies[0]?.id ?? null
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return companies.filter((company) => {
      const byAgent =
        agentFilter === "all" || company.assigned_to === agentFilter;
      const byStatus = statusFilter === "all" || company.status === statusFilter;
      const byPriority =
        priorityFilter === "all" || company.priority === priorityFilter;
      const byQuery =
        normalizedQuery.length === 0 ||
        company.name.toLowerCase().includes(normalizedQuery) ||
        company.rfc.toLowerCase().includes(normalizedQuery);

      return byAgent && byStatus && byPriority && byQuery;
    });
  }, [agentFilter, companies, priorityFilter, query, statusFilter]);

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
        <MetricCard title="Total empresas" value={kpis.total} helper="Pipeline completo" />
        <MetricCard title="Alta prioridad" value={kpis.high} helper="Necesitan seguimiento" />
        <MetricCard title="Sin movimiento" value={kpis.stale} helper=">= 7 dias" />
        <MetricCard title="Clientes" value={kpis.clients} helper="Estado client" />
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <select
          value={agentFilter}
          onChange={(event) => setAgentFilter(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">Todos los agentes</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>

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

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por empresa o RFC"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
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
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Asignado a</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Reasignar</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actividad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((company) => (
              <tr key={company.id}>
                <td className="px-4 py-3 font-semibold text-slate-900">{company.name}</td>
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
                <td className="px-4 py-3 text-slate-700">{company.assigned_agent_name}</td>
                <td className="px-4 py-3">
                  <ReassignCompanySelect
                    companyId={company.id}
                    currentAgentId={company.assigned_to}
                    agents={agents}
                  />
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
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No companies found with current filters.
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
