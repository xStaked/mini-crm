import type { CompanyPriority } from "@/lib/types";

const priorityClasses: Record<CompanyPriority, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
};

export function PriorityBadge({ priority }: { priority: CompanyPriority }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${priorityClasses[priority]}`}
    >
      {priority}
    </span>
  );
}
