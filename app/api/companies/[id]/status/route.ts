import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { COMPANY_STATUSES, type CompanyStatus } from "@/lib/types";

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
    | { status?: string }
    | null;
  const status = body?.status;

  if (!status || !COMPANY_STATUSES.includes(status as CompanyStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const baseQuery = supabase
    .from("companies")
    .update({ status, updated_at: new Date().toISOString() })
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

  await supabase.from("company_activities").insert({
    company_id: id,
    user_id: user.id,
    type: "status_change",
    content: `Status updated to ${status}`,
  });

  return NextResponse.json({ ok: true });
}
