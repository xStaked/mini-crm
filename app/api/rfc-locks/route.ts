import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { normalizeRfc } from "@/lib/rfc";
import { notifyUsers } from "@/lib/notifications";

const LOCK_MINUTES = 45;

export async function POST(request: NextRequest) {
  const { user, profile } = await getAuthContext();

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

  const existingCompany = await queryOne<{ id: string }>(
    `
      select id
      from companies
      where rfc_normalized = $1
      limit 1
    `,
    [rfcNormalized]
  );

  if (existingCompany) {
    return NextResponse.json(
      { error: "RFC already registered as a company" },
      { status: 409 }
    );
  }

  await query("delete from rfc_locks where expires_at <= now()");

  const existingLock = await queryOne<{
    id: string;
    locked_by: string;
    expires_at: string;
    locked_by_name: string | null;
  }>(
    `
      select l.id, l.locked_by, l.expires_at, u.name as locked_by_name
      from rfc_locks l
      left join users u on u.id = l.locked_by
      where l.rfc_normalized = $1
      limit 1
    `,
    [rfcNormalized]
  );

  const expiresAt = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();

  if (existingLock && existingLock.locked_by !== user.id) {
    await notifyUsers(undefined, [
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
        lockedBy: existingLock.locked_by_name ?? "Agent",
        expiresAt: existingLock.expires_at,
      },
      { status: 409 }
    );
  }

  const [data] = await query<{ id: string; expires_at: string }>(
    `
      insert into rfc_locks (office_id, rfc_normalized, company_name, locked_by, expires_at)
      values ($1, $2, $3, $4, $5)
      on conflict (rfc_normalized)
      do update set
        office_id = excluded.office_id,
        company_name = excluded.company_name,
        locked_by = excluded.locked_by,
        expires_at = excluded.expires_at
      returning id, expires_at
    `,
    [profile.office_id, rfcNormalized, body?.companyName?.trim() || null, user.id, expiresAt]
  );

  return NextResponse.json({
    id: data.id,
    rfc: rfcNormalized,
    expiresAt: data.expires_at,
  });
}

export async function DELETE(request: NextRequest) {
  const { user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { rfc?: string } | null;
  const rfc = body?.rfc?.trim();

  if (!rfc) {
    return NextResponse.json({ error: "RFC is required" }, { status: 400 });
  }

  const rfcNormalized = normalizeRfc(rfc);
  await query(
    `
      delete from rfc_locks
      where rfc_normalized = $1
        and locked_by = $2
    `,
    [rfcNormalized, user.id]
  );

  return NextResponse.json({ ok: true });
}
