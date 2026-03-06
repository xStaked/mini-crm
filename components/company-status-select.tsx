"use client";

import { useState, useTransition } from "react";
import { COMPANY_STATUSES, type CompanyStatus } from "@/lib/types";

type Props = {
  companyId: string;
  initialStatus: CompanyStatus;
};

export function CompanyStatusSelect({ companyId, initialStatus }: Props) {
  const [status, setStatus] = useState<CompanyStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onChange = (nextStatus: CompanyStatus) => {
    setStatus(nextStatus);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/companies/${companyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        setStatus(initialStatus);
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "Could not update status");
      }
    });
  };

  return (
    <div className="space-y-1">
      <select
        value={status}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value as CompanyStatus)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm capitalize"
      >
        {COMPANY_STATUSES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
