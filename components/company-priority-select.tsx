"use client";

import { useState, useTransition } from "react";
import { COMPANY_PRIORITIES, type CompanyPriority } from "@/lib/types";

type Props = {
  companyId: string;
  initialPriority: CompanyPriority;
};

export function CompanyPrioritySelect({ companyId, initialPriority }: Props) {
  const [priority, setPriority] = useState(initialPriority);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onChange = (nextPriority: CompanyPriority) => {
    setPriority(nextPriority);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/companies/${companyId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: nextPriority }),
      });

      if (!response.ok) {
        setPriority(initialPriority);
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "Could not update priority");
      }
    });
  };

  return (
    <div className="space-y-1">
      <select
        value={priority}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value as CompanyPriority)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm capitalize"
      >
        {COMPANY_PRIORITIES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
