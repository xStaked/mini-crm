import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const { user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await query(
    `
      select id, type, title, message, meta, read_at, created_at
      from notifications
      where user_id = $1
      order by created_at desc
      limit 20
    `,
    [user.id]
  );

  return NextResponse.json({ data });
}
