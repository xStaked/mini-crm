"use client";

import { useState, useTransition } from "react";
import { emitCompanyActivityUpdated } from "@/lib/company-activity-events";
import { COMPANY_PRODUCTS, type CompanyProduct } from "@/lib/types";

const productLabels: Record<CompanyProduct, string> = {
  divisas: "Divisas",
  bursatil: "Bursátil",
  ambos: "Ambos",
};

type Props = {
  companyId: string;
  initialProduct: CompanyProduct;
};

export function CompanyProductSelect({ companyId, initialProduct }: Props) {
  const [product, setProduct] = useState(initialProduct);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onChange = (nextProduct: CompanyProduct) => {
    setProduct(nextProduct);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/companies/${companyId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: nextProduct }),
      });

      if (!response.ok) {
        setProduct(initialProduct);
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "No se pudo actualizar el producto");
        return;
      }

      emitCompanyActivityUpdated(companyId);
    });
  };

  return (
    <div className="space-y-1">
      <select
        value={product}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value as CompanyProduct)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
      >
        {COMPANY_PRODUCTS.map((item) => (
          <option key={item} value={item}>
            {productLabels[item]}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
