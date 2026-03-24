import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        role?: "admin" | "agent";
        isActive?: boolean;
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updates: {
    name?: string;
    role?: "admin" | "agent";
    is_active?: boolean;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (body.role) updates.role = body.role;
  if (typeof body.isActive === "boolean") updates.is_active = body.isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const target = await queryOne<{ id: string; office_id: string }>(
    `
      select id, office_id
      from users
      where id = $1
      limit 1
    `,
    [id]
  );

  if (!target || target.office_id !== profile.office_id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const fields = Object.entries(updates);
  const assignments = fields.map(([key], index) => `${key} = $${index + 1}`);
  await query(
    `update users set ${assignments.join(", ")} where id = $${fields.length + 1}`,
    [...fields.map(([, value]) => value), id]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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

  const target = await queryOne<{ id: string; office_id: string }>(
    `
      select id, office_id
      from users
      where id = $1
      limit 1
    `,
    [id]
  );

  if (!target || target.office_id !== profile.office_id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await query("delete from users where id = $1", [id]);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not delete user",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
