import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function generatePassword() {
  return `${randomBytes(6).toString("hex")}A!9`;
}

export async function GET() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "User inactive" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,name,email,role,is_active,office_id,created_at")
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: false });

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

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Service role not configured",
      },
      { status: 500 }
    );
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: body?.password?.trim() || generatePassword(),
    email_confirm: true,
    user_metadata: {
      name,
      role,
      office_id: profile.office_id,
    },
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Could not create user" },
      { status: 400 }
    );
  }

  await supabase
    .from("users")
    .update({ name, role, office_id: profile.office_id, is_active: true })
    .eq("id", created.user.id);

  return NextResponse.json({
    id: created.user.id,
    email,
    role,
  });
}
