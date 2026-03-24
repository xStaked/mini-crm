"use client";

import { useState, useTransition } from "react";
import { emitCompanyActivityUpdated } from "@/lib/company-activity-events";
import { COMPANY_CONTACT_SOURCES, type CompanyContactSource } from "@/lib/types";

const sourceLabels: Record<CompanyContactSource, string> = {
  referido: "Referido",
  google: "Google",
  base_propia: "Base propia",
  otro: "Otro",
};

type Props = {
  companyId: string;
  initialContactSource: CompanyContactSource;
};

export function CompanyContactSourceSelect({
  companyId,
  initialContactSource,
}: Props) {
  const [contactSource, setContactSource] = useState(initialContactSource);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onChange = (next: CompanyContactSource) => {
    setContactSource(next);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/companies/${companyId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactSource: next }),
      });

      if (!response.ok) {
        setContactSource(initialContactSource);
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "No se pudo actualizar el medio de contacto");
        return;
      }

      emitCompanyActivityUpdated(companyId);
    });
  };

  return (
    <div className="space-y-1">
      <select
        value={contactSource}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value as CompanyContactSource)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
      >
        {COMPANY_CONTACT_SOURCES.map((item) => (
          <option key={item} value={item}>
            {sourceLabels[item]}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
