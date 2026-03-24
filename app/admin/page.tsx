import { redirect } from "next/navigation";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";
import { AdminUserManagement } from "@/components/admin-user-management";
import { LogoutForm } from "@/components/logout-form";
import { NotificationsMenu } from "@/components/notifications-menu";
import { RunRemindersButton } from "@/components/run-reminders-button";
import { getAuthContext } from "@/lib/auth";
import { query } from "@/lib/db";
import type {
  CompanyContactSource,
  CompanyContractStatus,
  CompanyProduct,
  CompanyStatus,
} from "@/lib/types";

type Agent = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  is_active: boolean;
  created_at: string;
};

type CompanyWithAgent = {
  id: string;
  name: string;
  rfc: string;
  status: CompanyStatus;
  product: CompanyProduct;
  contract_status: CompanyContractStatus;
  contact_source: CompanyContactSource;
  created_at: string;
  updated_at: string;
  next_action_at: string | null;
  assigned_to: string;
  users: { name: string }[] | null;
};

export default async function AdminDashboardPage() {
  const { user, profile } = await getAuthContext();

  if (!user || !profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const [companies, agents, users] = await Promise.all([
    query<CompanyWithAgent>(
      `
        select
          c.id,
          c.name,
          c.rfc,
          c.status,
          c.product,
          c.contract_status,
          c.contact_source,
          c.created_at,
          c.updated_at,
          c.next_action_at,
          c.assigned_to,
          jsonb_build_array(jsonb_build_object('name', u.name)) as users
        from companies c
        left join users u on u.id = c.assigned_to
        where c.office_id = $1
        order by c.created_at desc
      `,
      [profile.office_id]
    ),
    query<Agent>(
      `
        select id, name, email, role, is_active, created_at
        from users
        where role = 'agent'
          and office_id = $1
          and is_active = true
        order by name asc
      `,
      [profile.office_id]
    ),
    query<Agent>(
      `
        select id, name, email, role, is_active, created_at
        from users
        where office_id = $1
        order by created_at desc
      `,
      [profile.office_id]
    ),
  ]);

  const mappedCompanies = ((companies as CompanyWithAgent[] | null) ?? []).map(
    (company) => ({
      id: company.id,
      name: company.name,
      rfc: company.rfc,
      status: company.status,
      product: company.product,
      contract_status: company.contract_status,
      contact_source: company.contact_source,
      created_at: company.created_at,
      updated_at: company.updated_at,
      next_action_at: company.next_action_at,
      assigned_to: company.assigned_to,
      assigned_agent_name: company.users?.[0]?.name ?? "Sin asignar",
    })
  );

  return (
    <main className="min-h-screen bg-[var(--app-bg)] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
              Mini CRM
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Panel de Administracion</h1>
            <p className="text-sm text-slate-600">
              Oficina: {profile.office_name ?? "-"}. Control global por sucursal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RunRemindersButton />
            <NotificationsMenu />
            <LogoutForm />
          </div>
        </header>

        <AdminDashboardClient
          companies={mappedCompanies}
          agents={agents}
        />

        <AdminUserManagement initialUsers={users} />
      </div>
    </main>
  );
}
