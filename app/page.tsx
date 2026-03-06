import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";

export default async function HomePage() {
  const { user, profile } = await getAuthContext();

  if (!user || !profile || !profile.is_active) {
    redirect("/login");
  }

  if (profile?.role === "admin") {
    redirect("/admin");
  }

  redirect("/dashboard");
}
