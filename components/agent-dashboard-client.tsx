"use client";

import { useMemo, useState } from "react";
import { CompanyActivityPanel } from "@/components/company-activity-panel";
import { CompanyContactSourceSelect } from "@/components/company-contact-source-select";
import { CompanyContractStatusSelect } from "@/components/company-contract-status-select";
import { CompanyNextActionInput } from "@/components/company-next-action-input";
import { CompanyProductSelect } from "@/components/company-priority-select";
import { CompanyStatusSelect } from "@/components/company-status-select";
import {
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

type CompanyRow = {
  id: string;
  name: string;
  rfc: string;
  status: CompanyStatus;
  product: CompanyProduct;
  contract_status: CompanyContractStatus;
  contact_source: CompanyContactSource;
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
  const [productFilter, setProductFilter] = useState<string>("all");
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
      const byProduct = productFilter === "all" || company.product === productFilter;
      const byStale = !showStale || isStale(company);

      return byQuery && byStatus && byProduct && byStale;
    });
  }, [companies, productFilter, query, showStale, statusFilter]);

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
        <MetricCard title="Empresas" value={kpis.total} helper="Total asignadas" />
        <MetricCard title="Contratos activos" value={kpis.activos} helper="Situación activa" />
        <MetricCard title="Sin movimiento" value={kpis.stale} helper=">= 7 días" />
        <MetricCard title="En negociación" value={kpis.negociacion} helper="60-90 días" />
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

        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showStale}
            onChange={(event) => setShowStale(event.target.checked)}
            className="h-4 w-4"
          />
          Solo sin movimiento (7+ días)
        </label>
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
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actividad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((company) => (
              <tr key={company.id}>
                <td className="align-middle px-4 py-3">
                  <p className="font-semibold text-slate-900">{company.name}</p>
                  <p className="text-xs text-slate-500">
                    {isStale(company) ? "Sin movimiento" : "Activa"}
                  </p>
                </td>
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
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
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
