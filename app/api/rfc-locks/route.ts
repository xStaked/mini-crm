import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { normalizeRfc } from "@/lib/rfc";
import { notifyUsers } from "@/lib/notifications";

const LOCK_MINUTES = 45;

export async function POST(request: NextRequest) {
  const { supabase, user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "User inactive" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { rfc?: string; companyName?: string }
    | null;

  const rfc = body?.rfc?.trim();

  if (!rfc) {
    return NextResponse.json({ error: "RFC is required" }, { status: 400 });
  }

  const rfcNormalized = normalizeRfc(rfc);

  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("rfc_normalized", rfcNormalized)
    .maybeSingle();

  if (existingCompany) {
    return NextResponse.json(
      { error: "RFC already registered as a company" },
      { status: 409 }
    );
  }

  await supabase.from("rfc_locks").delete().lte("expires_at", new Date().toISOString());

  const { data: existingLock } = await supabase
    .from("rfc_locks")
    .select("id,locked_by,expires_at,users(name)")
    .eq("rfc_normalized", rfcNormalized)
    .maybeSingle();

  const expiresAt = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();

  if (existingLock && existingLock.locked_by !== user.id) {
    await notifyUsers(supabase, [
      {
        userId: user.id,
        type: "rfc_lock_conflict",
        title: "RFC ocupado temporalmente",
        message: `El RFC ${rfcNormalized} esta bloqueado por otro agente hasta ${new Date(
          existingLock.expires_at
        ).toLocaleTimeString()}`,
        meta: { rfc: rfcNormalized },
      },
    ]);

    return NextResponse.json(
      {
        error: "RFC temporarily locked by another agent",
        lockedBy: (existingLock.users as { name: string }[] | null)?.[0]?.name ?? "Agent",
        expiresAt: existingLock.expires_at,
      },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("rfc_locks")
    .upsert(
      {
        office_id: profile.office_id,
        rfc_normalized: rfcNormalized,
        company_name: body?.companyName?.trim() || null,
        locked_by: user.id,
        expires_at: expiresAt,
      },
      { onConflict: "rfc_normalized" }
    )
    .select("id,expires_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    rfc: rfcNormalized,
    expiresAt: data.expires_at,
  });
}

export async function DELETE(request: NextRequest) {
  const { supabase, user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { rfc?: string } | null;
  const rfc = body?.rfc?.trim();

  if (!rfc) {
    return NextResponse.json({ error: "RFC is required" }, { status: 400 });
  }

  const rfcNormalized = normalizeRfc(rfc);
  const { error } = await supabase
    .from("rfc_locks")
    .delete()
    .eq("rfc_normalized", rfcNormalized)
    .eq("locked_by", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
