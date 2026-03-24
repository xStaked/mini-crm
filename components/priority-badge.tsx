import type { CompanyProduct } from "@/lib/types";

const productClasses: Record<CompanyProduct, string> = {
  divisas: "bg-cyan-100 text-cyan-700",
  bursatil: "bg-violet-100 text-violet-700",
  ambos: "bg-indigo-100 text-indigo-700",
};

const productLabels: Record<CompanyProduct, string> = {
  divisas: "Divisas",
  bursatil: "Bursátil",
  ambos: "Ambos",
};

export function ProductBadge({ product }: { product: CompanyProduct }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${productClasses[product]}`}
    >
      {productLabels[product]}
    </span>
  );
}
