"use client";

import { useMemo, useState, useTransition } from "react";
import { emitCompanyActivityUpdated } from "@/lib/company-activity-events";

type Props = {
  companyId: string;
  initialValue: string | null;
};

function toInputDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function CompanyNextActionInput({ companyId, initialValue }: Props) {
  const [value, setValue] = useState(toInputDate(initialValue));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const original = useMemo(() => toInputDate(initialValue), [initialValue]);

  const save = (nextValue: string) => {
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/companies/${companyId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextActionAt: nextValue ? `${nextValue}T00:00:00.000Z` : null }),
      });

      if (!response.ok) {
        setValue(original);
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "Could not update next action");
        return;
      }

      emitCompanyActivityUpdated(companyId);
    });
  };

  return (
    <div className="space-y-1">
      <input
        type="date"
        value={value}
        disabled={isPending}
        onChange={(event) => {
          const nextValue = event.target.value;
          setValue(nextValue);
          save(nextValue);
        }}
        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
