import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { notifyUsers } from "@/lib/notifications";

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

  const { data: agent } = await supabase
    .from("users")
    .select("id,office_id,is_active")
    .eq("id", assignedTo)
    .eq("role", "agent")
    .maybeSingle();

  if (!agent || agent.office_id !== profile.office_id || !agent.is_active) {
    return NextResponse.json({ error: "Target agent not found or inactive" }, { status: 404 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id,name,assigned_to")
    .eq("id", id)
    .eq("office_id", profile.office_id)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("companies")
    .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("office_id", profile.office_id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Company not found or cannot be reassigned" },
      { status: 400 }
    );
  }

  await supabase.from("company_activities").insert({
    company_id: id,
    user_id: user.id,
    type: "reassignment",
    content: `Company reassigned to agent ${assignedTo}`,
  });

  await notifyUsers(supabase, [
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
