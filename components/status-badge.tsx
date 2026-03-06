import type { CompanyStatus } from "@/lib/types";

const statusClasses: Record<CompanyStatus, string> = {
  prospect: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  negotiation: "bg-amber-100 text-amber-700",
  client: "bg-emerald-100 text-emerald-700",
};

export function StatusBadge({ status }: { status: CompanyStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
