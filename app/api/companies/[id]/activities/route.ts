import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/types";

function canAccessCompany(companyAssignedTo: string, userId: string, role: string) {
  return role === "admin" || companyAssignedTo === userId;
}

export async function GET(
  _request: NextRequest,
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

  const company = await queryOne<{ assigned_to: string; office_id: string }>(
    `
      select assigned_to, office_id
      from companies
      where id = $1
      limit 1
    `,
    [id]
  );

  if (
    !company ||
    company.office_id !== profile.office_id ||
    !canAccessCompany(company.assigned_to, user.id, profile.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await query(
    `
      select
        a.id,
        a.company_id,
        a.user_id,
        a.type,
        a.content,
        a.created_at,
        jsonb_build_array(jsonb_build_object('name', u.name)) as users
      from company_activities a
      left join users u on u.id = a.user_id
      where a.company_id = $1
      order by a.created_at desc
      limit 25
    `,
    [id]
  );

  return NextResponse.json({ data });
}

export async function POST(
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
    | { type?: string; content?: string }
    | null;

  const type = body?.type as ActivityType | undefined;
  const content = body?.content?.trim();

  if (!type || !ACTIVITY_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const company = await queryOne<{ assigned_to: string; office_id: string }>(
    `
      select assigned_to, office_id
      from companies
      where id = $1
      limit 1
    `,
    [id]
  );

  if (
    !company ||
    company.office_id !== profile.office_id ||
    !canAccessCompany(company.assigned_to, user.id, profile.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await query(
    `
      insert into company_activities (company_id, user_id, type, content)
      values ($1, $2, $3, $4)
    `,
    [id, user.id, type, content]
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
