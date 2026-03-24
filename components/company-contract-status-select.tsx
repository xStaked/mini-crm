"use client";

import { useState, useTransition } from "react";
import { COMPANY_CONTRACT_STATUSES, type CompanyContractStatus } from "@/lib/types";

const contractLabels: Record<CompanyContractStatus, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
};

type Props = {
  companyId: string;
  initialContractStatus: CompanyContractStatus;
};

export function CompanyContractStatusSelect({
  companyId,
  initialContractStatus,
}: Props) {
  const [contractStatus, setContractStatus] = useState(initialContractStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onChange = (next: CompanyContractStatus) => {
    setContractStatus(next);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/companies/${companyId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractStatus: next }),
      });

      if (!response.ok) {
        setContractStatus(initialContractStatus);
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "No se pudo actualizar la situación");
      }
    });
  };

  return (
    <div className="space-y-1">
      <select
        value={contractStatus}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value as CompanyContractStatus)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
      >
        {COMPANY_CONTRACT_STATUSES.map((item) => (
          <option key={item} value={item}>
            {contractLabels[item]}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
