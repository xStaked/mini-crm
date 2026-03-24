import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PATCH() {
  const { user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await query(
    `
      update notifications
      set read_at = now()
      where user_id = $1
        and read_at is null
    `,
    [user.id]
  );

  return NextResponse.json({ ok: true });
}
