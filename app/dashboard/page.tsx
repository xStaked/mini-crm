import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentDashboardClient } from "@/components/agent-dashboard-client";
import { LogoutForm } from "@/components/logout-form";
import { NotificationsMenu } from "@/components/notifications-menu";
import { getAuthContext } from "@/lib/auth";
import { query } from "@/lib/db";
import type {
  CompanyContactSource,
  CompanyContractStatus,
  CompanyProduct,
  CompanyStatus,
} from "@/lib/types";

type CompanyRow = {
  id: string;
  name: string;
  rfc: string;
  status: CompanyStatus;
  product: CompanyProduct;
  contract_status: CompanyContractStatus;
  contact_source: CompanyContactSource;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
};

export default async function AgentDashboardPage() {
  const { user, profile } = await getAuthContext();

  if (!user || !profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/login");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  const rows = await query<CompanyRow>(
    `
      select
        id,
        name,
        rfc,
        status,
        product,
        contract_status,
        contact_source,
        next_action_at,
        created_at,
        updated_at
      from companies
      where assigned_to = $1
        and office_id = $2
      order by created_at desc
    `,
    [user.id, profile.office_id]
  );

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
