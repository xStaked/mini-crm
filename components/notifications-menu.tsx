"use client";

import { useMemo, useState } from "react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/notifications", { cache: "no-store" });
    setLoading(false);
    if (!response.ok) return;
    const payload = (await response.json()) as { data: NotificationItem[] };
    setItems(payload.data ?? []);
  };

  const markAllAsRead = async () => {
    const response = await fetch("/api/notifications/read-all", { method: "PATCH" });
    if (!response.ok) return;
    setItems((prev) => prev.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) void load();
        }}
        className="relative rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        Notificaciones
        {unread > 0 ? (
          <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-xs text-white">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <section className="absolute right-0 z-20 mt-2 w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Alertas internas</h3>
            <button
              onClick={markAllAsRead}
              className="text-xs font-medium text-cyan-700 hover:text-cyan-600"
            >
              Marcar todo como leido
            </button>
          </div>

          {loading ? <p className="text-xs text-slate-500">Cargando...</p> : null}

          <ul className="max-h-80 space-y-2 overflow-auto">
            {items.map((item) => (
              <li
                key={item.id}
                className={`rounded-lg border p-2 ${item.read_at ? "border-slate-200 bg-slate-50" : "border-cyan-200 bg-cyan-50"}`}
              >
                <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.message}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </li>
            ))}

            {!loading && items.length === 0 ? (
              <li className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                Sin notificaciones.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
