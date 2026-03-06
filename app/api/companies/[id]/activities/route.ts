import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/types";

function canAccessCompany(companyAssignedTo: string, userId: string, role: string) {
  return role === "admin" || companyAssignedTo === userId;
}

export async function GET(
  _request: NextRequest,
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

  const { data: company } = await supabase
    .from("companies")
    .select("assigned_to,office_id")
    .eq("id", id)
    .maybeSingle();

  if (
    !company ||
    company.office_id !== profile.office_id ||
    !canAccessCompany(company.assigned_to, user.id, profile.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("company_activities")
    .select(
      "id,company_id,user_id,type,content,created_at,users!company_activities_user_id_fkey(name)"
    )
    .eq("company_id", id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(
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

  const { data: company } = await supabase
    .from("companies")
    .select("assigned_to,office_id")
    .eq("id", id)
    .maybeSingle();

  if (
    !company ||
    company.office_id !== profile.office_id ||
    !canAccessCompany(company.assigned_to, user.id, profile.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("company_activities").insert({
    company_id: id,
    user_id: user.id,
    type,
    content,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
