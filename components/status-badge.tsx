import type { CompanyStatus } from "@/lib/types";

const statusClasses: Record<CompanyStatus, string> = {
  prospect: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  negotiation: "bg-amber-100 text-amber-700",
};

const statusLabels: Record<CompanyStatus, string> = {
  prospect: "Prospecto (0-30 días)",
  contacted: "Contacto (30-60 días)",
  negotiation: "Negociación (60-90 días)",
};

export function StatusBadge({ status }: { status: CompanyStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
