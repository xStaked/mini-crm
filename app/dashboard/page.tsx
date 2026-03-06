import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentDashboardClient } from "@/components/agent-dashboard-client";
import { LogoutForm } from "@/components/logout-form";
import { NotificationsMenu } from "@/components/notifications-menu";
import { getAuthContext } from "@/lib/auth";
import type { CompanyPriority, CompanyStatus } from "@/lib/types";

type CompanyRow = {
  id: string;
  name: string;
  rfc: string;
  status: CompanyStatus;
  priority: CompanyPriority;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
};

export default async function AgentDashboardPage() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user || !profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/login");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id,name,rfc,status,priority,next_action_at,created_at,updated_at")
    .eq("assigned_to", user.id)
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: false });

  const rows = (companies as CompanyRow[] | null) ?? [];

  return (
    <main className="min-h-screen bg-[var(--app-bg)] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
              Mini CRM
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Pipeline del Agente</h1>
            <p className="text-sm text-slate-600">
              Hola {profile.name}. Oficina: {profile.office_name ?? "-"}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <NotificationsMenu />
            <Link
              href="/companies/new"
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
            >
              Registrar empresa
            </Link>
            <LogoutForm />
          </div>
        </header>

        <AgentDashboardClient companies={rows} />
      </div>
    </main>
  );
}
