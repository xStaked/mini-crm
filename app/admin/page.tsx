import { redirect } from "next/navigation";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";
import { AdminUserManagement } from "@/components/admin-user-management";
import { LogoutForm } from "@/components/logout-form";
import { NotificationsMenu } from "@/components/notifications-menu";
import { RunRemindersButton } from "@/components/run-reminders-button";
import { getAuthContext } from "@/lib/auth";
import type { CompanyPriority, CompanyStatus } from "@/lib/types";

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
  priority: CompanyPriority;
  created_at: string;
  updated_at: string;
  next_action_at: string | null;
  assigned_to: string;
  users: { name: string }[] | null;
};

export default async function AdminDashboardPage() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user || !profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const [{ data: companies }, { data: agents }, { data: users }] = await Promise.all([
    supabase
      .from("companies")
      .select(
        "id,name,rfc,status,priority,created_at,updated_at,next_action_at,assigned_to,users!companies_assigned_to_fkey(name)"
      )
      .eq("office_id", profile.office_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("id,name,email")
      .eq("role", "agent")
      .eq("office_id", profile.office_id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("users")
      .select("id,name,email,role,is_active,created_at")
      .eq("office_id", profile.office_id)
      .order("created_at", { ascending: false }),
  ]);

  const mappedCompanies = ((companies as CompanyWithAgent[] | null) ?? []).map(
    (company) => ({
      id: company.id,
      name: company.name,
      rfc: company.rfc,
      status: company.status,
      priority: company.priority,
      created_at: company.created_at,
      updated_at: company.updated_at,
      next_action_at: company.next_action_at,
      assigned_to: company.assigned_to,
      assigned_agent_name: company.users?.[0]?.name ?? "Unknown",
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
          agents={(agents as Agent[] | null) ?? []}
        />

        <AdminUserManagement initialUsers={(users as Agent[] | null) ?? []} />
      </div>
    </main>
  );
}
