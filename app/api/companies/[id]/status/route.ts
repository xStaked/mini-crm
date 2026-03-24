import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { queryOne, withTransaction } from "@/lib/db";
import { COMPANY_STATUSES, type CompanyStatus } from "@/lib/types";

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

  const body = (await request.json().catch(() => null)) as
    | { status?: string }
    | null;
  const status = body?.status;

  if (!status || !COMPANY_STATUSES.includes(status as CompanyStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const company = await queryOne<{ id: string; assigned_to: string }>(
    `
      select id, assigned_to
      from companies
      where id = $1
        and office_id = $2
      limit 1
    `,
    [id, profile.office_id]
  );

  if (!company || (profile.role === "agent" && company.assigned_to !== user.id)) {
    return NextResponse.json(
      { error: "Company not found or unauthorized" },
      { status: 403 }
    );
  }

  await withTransaction(async (client) => {
    await client.query(
      `
        update companies
        set status = $1, updated_at = now()
        where id = $2
      `,
      [status, id]
    );

    await client.query(
      `
        insert into company_activities (company_id, user_id, type, content)
        values ($1, $2, 'status_change', $3)
      `,
      [id, user.id, `Status updated to ${status}`]
    );
  });

  return NextResponse.json({ ok: true });
}
