import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { query, queryOne, withTransaction } from "@/lib/db";
import { notifyUsers } from "@/lib/notifications";
import { isLikelyValidRfc, normalizeRfc } from "@/lib/rfc";
import {
  COMPANY_CONTACT_SOURCES,
  COMPANY_CONTRACT_STATUSES,
  COMPANY_PRODUCTS,
  COMPANY_STATUSES,
  type CompanyContactSource,
  type CompanyContractStatus,
  type CompanyProduct,
  type CompanyStatus,
} from "@/lib/types";

type ExistingCompany = {
  id: string;
  created_at: string;
  status: CompanyStatus;
  assigned_agent_name: string | null;
};

function getAssignedAgentName(existing: ExistingCompany | null): string {
  return existing?.assigned_agent_name ?? "Unknown";
}

export async function GET(request: NextRequest) {
  const { user, profile } = await getAuthContext();

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

  const conditions = ["c.office_id = $1"];
  const values: unknown[] = [profile.office_id];

  if (profile.role === "agent") {
    values.push(user.id);
    conditions.push(`c.assigned_to = $${values.length}`);
  }

  if (profile.role === "admin" && agentFilter) {
    values.push(agentFilter);
    conditions.push(`c.assigned_to = $${values.length}`);
  }

  if (statusFilter && COMPANY_STATUSES.includes(statusFilter as CompanyStatus)) {
    values.push(statusFilter);
    conditions.push(`c.status = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(c.name ilike $${values.length} or c.rfc ilike $${values.length})`);
  }

  const data = await query(
    `
      select
        c.id,
        c.name,
        c.rfc,
        c.status,
        c.product,
        c.contract_status,
        c.contact_source,
        c.next_action_at,
        c.updated_at,
        c.created_at,
        c.assigned_to,
        jsonb_build_array(jsonb_build_object('name', u.name)) as users
      from companies c
      left join users u on u.id = c.assigned_to
      where ${conditions.join(" and ")}
      order by c.created_at desc
    `,
    values
  );

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const { user, profile } = await getAuthContext();

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
        product?: string;
        contractStatus?: string;
        contactSource?: string;
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
  const product = (body?.product ?? "divisas") as CompanyProduct;
  const contractStatus = (body?.contractStatus ?? "activo") as CompanyContractStatus;
  const contactSource = (body?.contactSource ?? "otro") as CompanyContactSource;

  if (!COMPANY_PRODUCTS.includes(product)) {
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }
  if (!COMPANY_CONTRACT_STATUSES.includes(contractStatus)) {
    return NextResponse.json({ error: "Invalid contract status" }, { status: 400 });
  }
  if (!COMPANY_CONTACT_SOURCES.includes(contactSource)) {
    return NextResponse.json({ error: "Invalid contact source" }, { status: 400 });
  }

  const existing = await queryOne<ExistingCompany>(
    `
      select
        c.id,
        c.created_at,
        c.status,
        u.name as assigned_agent_name
      from companies c
      left join users u on u.id = c.assigned_to
      where c.rfc_normalized = $1
      limit 1
    `,
    [rfcNormalized]
  );

  if (existing) {
    await notifyUsers(undefined, [
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
          assignedAgentName: getAssignedAgentName(existing),
          createdAt: existing.created_at,
          status: existing.status,
        },
      },
      { status: 409 }
    );
  }

  const assignedTo = user.id;
  const initialStatus: CompanyStatus = "prospect";

  const lock = await queryOne<{ locked_by: string; expires_at: string }>(
    `
      select locked_by, expires_at
      from rfc_locks
      where rfc_normalized = $1
      limit 1
    `,
    [rfcNormalized]
  );

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

  try {
    const data = await withTransaction(async (client) => {
      const insertResult = await client.query<{ id: string }>(
        `
          insert into companies (
            name,
            rfc,
            rfc_normalized,
            phone,
            email,
            notes,
            status,
            product,
            contract_status,
            contact_source,
            next_action_at,
            assigned_to,
            office_id
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          returning id
        `,
        [
          name,
          rfc,
          rfcNormalized,
          body?.phone?.trim() || null,
          body?.email?.trim() || null,
          body?.notes?.trim() || null,
          initialStatus,
          product,
          contractStatus,
          contactSource,
          body?.nextActionAt ?? null,
          assignedTo,
          profile.office_id,
        ]
      );

      await client.query(
        `
          delete from rfc_locks
          where rfc_normalized = $1
            and locked_by = $2
        `,
        [rfcNormalized, user.id]
      );

      return insertResult.rows[0];
    });

    const officeUsers = await query<{ id: string; role: string }>(
      `
        select id, role
        from users
        where office_id = $1
      `,
      [profile.office_id]
    );

    await notifyUsers(
      undefined,
      officeUsers
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
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const duplicate = await queryOne<ExistingCompany>(
        `
          select
            c.id,
            c.created_at,
            c.status,
            u.name as assigned_agent_name
          from companies c
          left join users u on u.id = c.assigned_to
          where c.rfc_normalized = $1
          limit 1
        `,
        [rfcNormalized]
      );

      return NextResponse.json(
        {
          error: "This company is already registered.",
          duplicate: {
            assignedAgentName: getAssignedAgentName(
              duplicate
            ),
            createdAt: duplicate?.created_at,
            status: duplicate?.status,
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not create company",
      },
      { status: 500 }
    );
  }
}
