import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { hashPassword } from "@/lib/password";

function generatePassword() {
  return `${randomBytes(6).toString("hex")}A!9`;
}

export async function GET() {
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

  const data = await query(
    `
      select id, name, email, role, is_active, office_id, created_at
      from users
      where office_id = $1
      order by created_at desc
    `,
    [profile.office_id]
  );

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
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
    | { name?: string; email?: string; password?: string; role?: "agent" | "admin" }
    | null;

  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  const role = body?.role ?? "agent";

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  try {
    const passwordHash = hashPassword(body?.password?.trim() || generatePassword());
    const created = await withTransaction(async (client) => {
      const result = await client.query<{
        id: string;
        email: string;
        role: "admin" | "agent";
      }>(
        `
          insert into users (name, email, role, office_id, is_active, password_hash)
          values ($1, $2, $3, $4, true, $5)
          returning id, email, role
        `,
        [name, email, role, profile.office_id, passwordHash]
      );

      return result.rows[0];
    });

    return NextResponse.json(created);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not create user",
      },
      { status: 400 }
    );
  }
}
