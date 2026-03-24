"use client";

import { useMemo, useState } from "react";
import { CompanyActivityPanel } from "@/components/company-activity-panel";
import { CompanyContactSourceSelect } from "@/components/company-contact-source-select";
import { CompanyContractStatusSelect } from "@/components/company-contract-status-select";
import { CompanyNextActionInput } from "@/components/company-next-action-input";
import { CompanyProductSelect } from "@/components/company-priority-select";
import { CompanyStatusSelect } from "@/components/company-status-select";
import { ReassignCompanySelect } from "@/components/reassign-company-select";
import {
  COMPANY_CONTRACT_STATUSES,
  COMPANY_PRODUCTS,
  COMPANY_STATUSES,
  type CompanyContactSource,
  type CompanyContractStatus,
  type CompanyProduct,
  type CompanyStatus,
} from "@/lib/types";

const statusLabels: Record<CompanyStatus, string> = {
  prospect: "Prospecto (0-30 días)",
  contacted: "Contacto (30-60 días)",
  negotiation: "Negociación (60-90 días)",
};

const productLabels: Record<CompanyProduct, string> = {
  divisas: "Divisas",
  bursatil: "Bursátil",
  ambos: "Ambos",
};

const contractLabels: Record<CompanyContractStatus, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
};

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
  product: CompanyProduct;
  contract_status: CompanyContractStatus;
  contact_source: CompanyContactSource;
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
  const [productFilter, setProductFilter] = useState<string>("all");
  const [contractFilter, setContractFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    companies[0]?.id ?? null
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return companies.filter((company) => {
      const byAgent = agentFilter === "all" || company.assigned_to === agentFilter;
      const byStatus = statusFilter === "all" || company.status === statusFilter;
      const byProduct = productFilter === "all" || company.product === productFilter;
      const byContract =
        contractFilter === "all" || company.contract_status === contractFilter;
      const byQuery =
        normalizedQuery.length === 0 ||
        company.name.toLowerCase().includes(normalizedQuery) ||
        company.rfc.toLowerCase().includes(normalizedQuery);

      return byAgent && byStatus && byProduct && byContract && byQuery;
    });
  }, [agentFilter, companies, contractFilter, productFilter, query, statusFilter]);

  const kpis = useMemo(() => {
    const total = companies.length;
    const stale = companies.filter(isStale).length;
    const activos = companies.filter((item) => item.contract_status === "activo").length;
    const negociacion = companies.filter((item) => item.status === "negotiation").length;

    return { total, stale, activos, negociacion };
  }, [companies]);

  const selected = filtered.find((item) => item.id === selectedCompanyId) ?? filtered[0];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard title="Total empresas" value={kpis.total} helper="Pipeline completo" />
        <MetricCard title="Contratos activos" value={kpis.activos} helper="Situación activa" />
        <MetricCard title="Sin movimiento" value={kpis.stale} helper=">= 7 días" />
        <MetricCard title="En negociación" value={kpis.negociacion} helper="60-90 días" />
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
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
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">Todos los estados</option>
          {COMPANY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>

        <select
          value={productFilter}
          onChange={(event) => setProductFilter(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">Todos los productos</option>
          {COMPANY_PRODUCTS.map((product) => (
            <option key={product} value={product}>
              {productLabels[product]}
            </option>
          ))}
        </select>

        <select
          value={contractFilter}
          onChange={(event) => setContractFilter(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">Sit. contrato</option>
          {COMPANY_CONTRACT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {contractLabels[item]}
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
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Producto</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Sit. Contrato</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Medio de contacto</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Próxima acción</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Asignado a</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Reasignar</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actividad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((company) => (
              <tr key={company.id}>
                <td className="align-middle px-4 py-3 font-semibold text-slate-900">{company.name}</td>
                <td className="align-middle px-4 py-3 text-slate-700">{company.rfc}</td>
                <td className="align-middle px-4 py-3">
                  <CompanyStatusSelect
                    companyId={company.id}
                    initialStatus={company.status}
                  />
                </td>
                <td className="align-middle px-4 py-3">
                  <CompanyProductSelect
                    companyId={company.id}
                    initialProduct={company.product}
                  />
                </td>
                <td className="align-middle px-4 py-3">
                  <CompanyContractStatusSelect
                    companyId={company.id}
                    initialContractStatus={company.contract_status}
                  />
                </td>
                <td className="align-middle px-4 py-3">
                  <CompanyContactSourceSelect
                    companyId={company.id}
                    initialContactSource={company.contact_source}
                  />
                </td>
                <td className="align-middle px-4 py-3">
                  <CompanyNextActionInput
                    companyId={company.id}
                    initialValue={company.next_action_at}
                  />
                </td>
                <td className="align-middle px-4 py-3 text-slate-700">{company.assigned_agent_name}</td>
                <td className="align-middle px-4 py-3">
                  <ReassignCompanySelect
                    companyId={company.id}
                    currentAgentId={company.assigned_to}
                    agents={agents}
                  />
                </td>
                <td className="align-middle px-4 py-3">
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
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  No hay empresas con los filtros actuales.
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
