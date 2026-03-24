"use client";

import { useState, useTransition } from "react";
import { emitCompanyActivityUpdated } from "@/lib/company-activity-events";

type Agent = {
  id: string;
  name: string;
};

type Props = {
  companyId: string;
  currentAgentId: string;
  agents: Agent[];
};

export function ReassignCompanySelect({
  companyId,
  currentAgentId,
  agents,
}: Props) {
  const [selectedAgentId, setSelectedAgentId] = useState(currentAgentId);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onChange = (nextAgentId: string) => {
    setSelectedAgentId(nextAgentId);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/companies/${companyId}/reassign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: nextAgentId }),
      });

      if (!response.ok) {
        setSelectedAgentId(currentAgentId);
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "Could not reassign company");
        return;
      }

      emitCompanyActivityUpdated(companyId);
    });
  };

  return (
    <div className="space-y-1">
      <select
        value={selectedAgentId}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
      >
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
