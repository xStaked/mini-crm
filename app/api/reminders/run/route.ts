import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { notifyUsers } from "@/lib/notifications";

export async function POST() {
  const { user, profile } = await getAuthContext();

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

  const dueCompanies = await query<{
    id: string;
    name: string;
    assigned_to: string;
    next_action_at: string | null;
  }>(
    `
      select id, name, assigned_to, next_action_at
      from companies
      where office_id = $1
        and next_action_at is not null
        and next_action_at <= $2
        and status <> 'client'
      limit 200
    `,
    [profile.office_id, in24h.toISOString()]
  );

  const today = now.toISOString().slice(0, 10);

  const notifications = await Promise.all(
    dueCompanies.map(async (company) => {
      const exists = await queryOne<{ id: string }>(
        `
          select id
          from notifications
          where user_id = $1
            and type = 'reminder_next_action'
            and meta @> $2::jsonb
          limit 1
        `,
        [company.assigned_to, JSON.stringify({ company_id: company.id, date: today })]
      );

      if (exists) {
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
    undefined,
    notifications.filter((item): item is NonNullable<typeof item> => Boolean(item))
  );

  return NextResponse.json({
    ok: true,
    remindersSent: notifications.filter(Boolean).length,
  });
}
