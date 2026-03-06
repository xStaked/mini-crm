import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { LogoutForm } from "@/components/logout-form";
import { getAuthContext } from "@/lib/auth";

export default async function LoginPage() {
  const { user, profile } = await getAuthContext();

  if (user && profile?.is_active) {
    redirect(profile?.role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--app-bg)] px-4">
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-blue-300/30 blur-3xl" />

      <section className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-7 shadow-xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
          Mini CRM
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Bienvenido</h1>
        <p className="mb-6 mt-1 text-sm text-slate-600">
          Plataforma para evitar duplicidad de prospectos por RFC.
        </p>
        {user && profile && !profile.is_active ? (
          <div className="space-y-3">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Tu usuario esta inactivo. Contacta al administrador.
            </p>
            <LogoutForm />
          </div>
        ) : (
          <LoginForm />
        )}
      </section>
    </main>
  );
}
