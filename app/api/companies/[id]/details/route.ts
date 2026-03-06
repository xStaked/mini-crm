import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { COMPANY_PRIORITIES, type CompanyPriority } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { supabase, user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "User inactive" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { priority?: string; nextActionAt?: string | null }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload: { priority?: CompanyPriority; next_action_at?: string | null } = {};

  if (body?.priority) {
    if (!COMPANY_PRIORITIES.includes(body.priority as CompanyPriority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    payload.priority = body.priority as CompanyPriority;
  }

  if (body && "nextActionAt" in body) {
    payload.next_action_at = body.nextActionAt ?? null;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const baseQuery = supabase
    .from("companies")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("office_id", profile.office_id);

  const { data, error } =
    profile.role === "agent"
      ? await baseQuery.eq("assigned_to", user.id).select("id").single()
      : await baseQuery.select("id").single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Company not found or unauthorized" },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
