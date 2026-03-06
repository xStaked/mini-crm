"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { isLikelyValidRfc, normalizeRfc } from "@/lib/rfc";
import { COMPANY_PRIORITIES, type CompanyPriority } from "@/lib/types";

type DuplicateData = {
  assignedAgentName: string;
  createdAt: string;
  status: string;
};

export function CompanyCreateForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [rfc, setRfc] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<CompanyPriority>("medium");
  const [nextActionAt, setNextActionAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateData | null>(null);
  const [lockInfo, setLockInfo] = useState<{
    rfc: string;
    expiresAt: string;
  } | null>(null);

  const lockRfc = async () => {
    setError(null);
    setDuplicate(null);

    if (!isLikelyValidRfc(rfc)) {
      setError(
        "RFC invalido. Usa un formato como: ABC123456T12 o ABCD123456T12."
      );
      return false;
    }

    setLocking(true);
    const response = await fetch("/api/rfc-locks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rfc, companyName: name || undefined }),
    });
    setLocking(false);

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; rfc?: string; expiresAt?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "No se pudo bloquear RFC");
      return false;
    }

    if (payload?.rfc && payload.expiresAt) {
      setLockInfo({ rfc: payload.rfc, expiresAt: payload.expiresAt });
    }
    return true;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setDuplicate(null);

    if (!isLikelyValidRfc(rfc)) {
      setError(
        "RFC invalido. Usa un formato como: ABC123456T12 o ABCD123456T12."
      );
      return;
    }

    const normalized = normalizeRfc(rfc);
    if (!lockInfo || lockInfo.rfc !== normalized) {
      const locked = await lockRfc();
      if (!locked) return;
    }

    setLoading(true);

    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        rfc,
        phone,
        email,
        notes,
        priority,
        nextActionAt: nextActionAt ? `${nextActionAt}T00:00:00.000Z` : null,
      }),
    });

    setLoading(false);

    if (response.status === 409) {
      const payload = (await response.json()) as {
        error: string;
        duplicate?: DuplicateData;
      };
      setError(payload.error);
      if (payload.duplicate) {
        setDuplicate(payload.duplicate);
      }
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Could not save company");
      return;
    }

    await fetch("/api/rfc-locks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rfc }),
    }).catch(() => null);

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Company Name
        </label>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">RFC</label>
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input
            required
            value={rfc}
            onChange={(event) => {
              setRfc(event.target.value);
              setLockInfo(null);
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
            placeholder="Ejemplo: ABC123456T12"
          />
          <button
            type="button"
            onClick={() => void lockRfc()}
            disabled={locking}
            className="rounded-md border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60"
          >
            {locking ? "Bloqueando..." : "Bloquear RFC (45m)"}
          </button>
        </div>
        {lockInfo ? (
          <p className="mt-1 text-xs text-emerald-700">
            RFC bloqueado hasta {new Date(lockInfo.expiresAt).toLocaleTimeString()}.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Priority
          </label>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as CompanyPriority)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize"
          >
            {COMPANY_PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Next action date
          </label>
          <input
            type="date"
            value={nextActionAt}
            onChange={(event) => setNextActionAt(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {duplicate ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">This company is already registered.</p>
          <p>Assigned agent: {duplicate.assignedAgentName}</p>
          <p>Status: {duplicate.status}</p>
          <p>
            Registration date:{" "}
            {new Date(duplicate.createdAt).toLocaleString()}
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save company"}
      </button>
    </form>
  );
}
