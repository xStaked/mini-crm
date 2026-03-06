import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { notifyUsers } from "@/lib/notifications";

export async function POST() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "User inactive" }, { status: 403 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: dueCompanies, error } = await supabase
    .from("companies")
    .select("id,name,assigned_to,next_action_at")
    .eq("office_id", profile.office_id)
    .not("next_action_at", "is", null)
    .lte("next_action_at", in24h.toISOString())
    .neq("status", "client")
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const today = now.toISOString().slice(0, 10);

  const notifications = await Promise.all(
    (dueCompanies ?? []).map(async (company) => {
      const { data: exists } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", company.assigned_to)
        .eq("type", "reminder_next_action")
        .contains("meta", { company_id: company.id, date: today })
        .limit(1);

      if ((exists ?? []).length > 0) {
        return null;
      }

      return {
        userId: company.assigned_to,
        type: "reminder_next_action",
        title: "Recordatorio de seguimiento",
        message: `La empresa ${company.name} tiene una accion pendiente hoy o en las proximas 24h.`,
        meta: {
          company_id: company.id,
          date: today,
          next_action_at: company.next_action_at,
        },
      };
    })
  );

  await notifyUsers(
    supabase,
    notifications.filter((item): item is NonNullable<typeof item> => Boolean(item))
  );

  return NextResponse.json({
    ok: true,
    remindersSent: notifications.filter(Boolean).length,
  });
}
