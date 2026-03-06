import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { notifyUsers } from "@/lib/notifications";
import { isLikelyValidRfc, normalizeRfc } from "@/lib/rfc";
import {
  COMPANY_PRIORITIES,
  COMPANY_STATUSES,
  type CompanyPriority,
  type CompanyStatus,
} from "@/lib/types";

type ExistingCompany = {
  id: string;
  created_at: string;
  status: CompanyStatus;
  users: { name: string }[] | null;
};

function getAssignedAgentName(existing: ExistingCompany | null): string {
  return existing?.users?.[0]?.name ?? "Unknown";
}

export async function GET(request: NextRequest) {
  const { supabase, user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "User inactive" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const statusFilter = params.get("status");
  const agentFilter = params.get("agentId");
  const search = params.get("search");

  let query = supabase
    .from("companies")
    .select(
      "id,name,rfc,status,priority,next_action_at,updated_at,created_at,assigned_to,users!companies_assigned_to_fkey(name)"
    )
    .order("created_at", { ascending: false });

  if (profile.role === "agent") {
    query = query.eq("assigned_to", user.id);
  }

  query = query.eq("office_id", profile.office_id);

  if (profile.role === "admin" && agentFilter) {
    query = query.eq("assigned_to", agentFilter);
  }

  if (statusFilter && COMPANY_STATUSES.includes(statusFilter as CompanyStatus)) {
    query = query.eq("status", statusFilter);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,rfc.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { supabase, user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "User inactive" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        rfc?: string;
        priority?: string;
        nextActionAt?: string | null;
        phone?: string;
        email?: string;
        notes?: string;
      }
    | null;

  const name = body?.name?.trim();
  const rfc = body?.rfc?.trim();

  if (!name || !rfc) {
    return NextResponse.json(
      { error: "Company name and RFC are required" },
      { status: 400 }
    );
  }

  if (!isLikelyValidRfc(rfc)) {
    return NextResponse.json(
      {
        error:
          "RFC invalido. Usa un formato como: ABC123456T12 o ABCD123456T12.",
      },
      { status: 400 }
    );
  }

  const rfcNormalized = normalizeRfc(rfc);
  const priority = (body?.priority ?? "medium") as CompanyPriority;

  if (!COMPANY_PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("companies")
    .select("id,created_at,status,users!companies_assigned_to_fkey(name)")
    .eq("rfc_normalized", rfcNormalized)
    .maybeSingle();

  if (existing) {
    const found = existing as unknown as ExistingCompany;
    await notifyUsers(supabase, [
      {
        userId: user.id,
        type: "duplicate_rfc",
        title: "Empresa duplicada detectada",
        message: `Intentaste registrar RFC ${rfcNormalized}, pero ya existe.`,
        meta: { rfc: rfcNormalized },
      },
    ]);
    return NextResponse.json(
      {
        error: "This company is already registered.",
        duplicate: {
          assignedAgentName: getAssignedAgentName(found),
          createdAt: found.created_at,
          status: found.status,
        },
      },
      { status: 409 }
    );
  }

  const assignedTo = user.id;
  const initialStatus: CompanyStatus = "prospect";

  const { data: lock } = await supabase
    .from("rfc_locks")
    .select("locked_by,expires_at")
    .eq("rfc_normalized", rfcNormalized)
    .maybeSingle();

  if (
    lock &&
    lock.locked_by !== user.id &&
    new Date(lock.expires_at).getTime() > Date.now()
  ) {
    return NextResponse.json(
      { error: "RFC temporarily locked by another agent" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name,
      rfc,
      rfc_normalized: rfcNormalized,
      phone: body?.phone?.trim() || null,
      email: body?.email?.trim() || null,
      notes: body?.notes?.trim() || null,
      status: initialStatus,
      priority,
      next_action_at: body?.nextActionAt ?? null,
      assigned_to: assignedTo,
      office_id: profile.office_id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: duplicate } = await supabase
        .from("companies")
        .select("created_at,status,users!companies_assigned_to_fkey(name)")
        .eq("rfc_normalized", rfcNormalized)
        .maybeSingle();

      return NextResponse.json(
        {
          error: "This company is already registered.",
          duplicate: {
            assignedAgentName: getAssignedAgentName(
              (duplicate as unknown as ExistingCompany | null) ?? null
            ),
            createdAt: (duplicate as ExistingCompany | null)?.created_at,
            status: (duplicate as ExistingCompany | null)?.status,
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from("rfc_locks")
    .delete()
    .eq("rfc_normalized", rfcNormalized)
    .eq("locked_by", user.id);

  const { data: officeUsers } = await supabase
    .from("users")
    .select("id,role")
    .eq("office_id", profile.office_id);

  await notifyUsers(
    supabase,
    (officeUsers ?? [])
      .filter((item) => item.id !== user.id && item.role === "admin")
      .map((item) => ({
        userId: item.id,
        type: "company_created",
        title: "Nueva empresa registrada",
        message: `${name} fue registrada por ${profile.name}.`,
        meta: { company_id: data.id, rfc: rfcNormalized },
      }))
  );

  return NextResponse.json({ id: data.id }, { status: 201 });
}
