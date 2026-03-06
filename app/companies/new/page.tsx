import Link from "next/link";
import { redirect } from "next/navigation";
import { CompanyCreateForm } from "@/components/company-create-form";
import { getAuthContext } from "@/lib/auth";

export default async function NewCompanyPage() {
  const { user, profile } = await getAuthContext();

  if (!user || !profile) {
    redirect("/login");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
              Prospectos
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Registrar empresa</h1>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
          >
            Volver
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <CompanyCreateForm />
        </section>
      </div>
    </main>
  );
}
