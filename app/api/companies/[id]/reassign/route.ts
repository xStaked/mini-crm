import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { queryOne, withTransaction } from "@/lib/db";
import { notifyUsers } from "@/lib/notifications";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "User inactive" }, { status: 403 });
  }

  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { assignedTo?: string }
    | null;
  const assignedTo = body?.assignedTo;

  if (!assignedTo) {
    return NextResponse.json({ error: "assignedTo is required" }, { status: 400 });
  }

  const agent = await queryOne<{ id: string; office_id: string; is_active: boolean }>(
    `
      select id, office_id, is_active
      from users
      where id = $1
        and role = 'agent'
      limit 1
    `,
    [assignedTo]
  );

  if (!agent || agent.office_id !== profile.office_id || !agent.is_active) {
    return NextResponse.json({ error: "Target agent not found or inactive" }, { status: 404 });
  }

  const company = await queryOne<{ id: string; name: string; assigned_to: string }>(
    `
      select id, name, assigned_to
      from companies
      where id = $1
        and office_id = $2
      limit 1
    `,
    [id, profile.office_id]
  );

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  await withTransaction(async (client) => {
    await client.query(
      `
        update companies
        set assigned_to = $1, updated_at = now()
        where id = $2
      `,
      [assignedTo, id]
    );

    await client.query(
      `
        insert into company_activities (company_id, user_id, type, content)
        values ($1, $2, 'reassignment', $3)
      `,
      [id, user.id, `Company reassigned to agent ${assignedTo}`]
    );
  });

  await notifyUsers(undefined, [
    {
      userId: assignedTo,
      type: "company_reassigned",
      title: "Empresa reasignada",
      message: `${company.name} fue reasignada a tu cartera.`,
      meta: { company_id: company.id },
    },
    {
      userId: company.assigned_to,
      type: "company_reassigned",
      title: "Empresa reasignada",
      message: `${company.name} fue reasignada a otro agente.`,
      meta: { company_id: company.id },
    },
  ]);

  return NextResponse.json({ ok: true });
}
