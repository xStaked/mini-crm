"use client";

import { useState } from "react";

export function RunRemindersButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);

    const response = await fetch("/api/reminders/run", { method: "POST" });
    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setResult(payload?.error ?? "No se pudieron generar recordatorios");
      return;
    }

    const payload = (await response.json()) as { remindersSent: number };
    setResult(`Recordatorios enviados: ${payload.remindersSent}`);
  };

  return (
    <div className="space-y-1">
      <button
        onClick={run}
        disabled={loading}
        className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60"
      >
        {loading ? "Ejecutando..." : "Generar recordatorios"}
      </button>
      {result ? <p className="text-xs text-slate-600">{result}</p> : null}
    </div>
  );
}
