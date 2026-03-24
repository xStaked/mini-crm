import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { queryOne, withTransaction } from "@/lib/db";
import {
  COMPANY_CONTACT_SOURCES,
  COMPANY_CONTRACT_STATUSES,
  COMPANY_PRODUCTS,
  type CompanyContactSource,
  type CompanyContractStatus,
  type CompanyProduct,
} from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return "sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { user, profile } = await getAuthContext();

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "User inactive" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        product?: string;
        contractStatus?: string;
        contactSource?: string;
        nextActionAt?: string | null;
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload: {
    product?: CompanyProduct;
    contract_status?: CompanyContractStatus;
    contact_source?: CompanyContactSource;
    next_action_at?: string | null;
  } = {};

  if (body?.product) {
    if (!COMPANY_PRODUCTS.includes(body.product as CompanyProduct)) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }
    payload.product = body.product as CompanyProduct;
  }

  if (body?.contractStatus) {
    if (!COMPANY_CONTRACT_STATUSES.includes(body.contractStatus as CompanyContractStatus)) {
      return NextResponse.json({ error: "Invalid contract status" }, { status: 400 });
    }
    payload.contract_status = body.contractStatus as CompanyContractStatus;
  }

  if (body?.contactSource) {
    if (!COMPANY_CONTACT_SOURCES.includes(body.contactSource as CompanyContactSource)) {
      return NextResponse.json({ error: "Invalid contact source" }, { status: 400 });
    }
    payload.contact_source = body.contactSource as CompanyContactSource;
  }

  if (body && "nextActionAt" in body) {
    payload.next_action_at = body.nextActionAt ?? null;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const company = await queryOne<{
    id: string;
    assigned_to: string;
    product: CompanyProduct;
    contract_status: CompanyContractStatus;
    contact_source: CompanyContactSource;
    next_action_at: string | null;
  }>(
    `
      select id, assigned_to, product, contract_status, contact_source, next_action_at
      from companies
      where id = $1
        and office_id = $2
      limit 1
    `,
    [id, profile.office_id]
  );

  if (!company || (profile.role === "agent" && company.assigned_to !== user.id)) {
    return NextResponse.json(
      { error: "Company not found or unauthorized" },
      { status: 403 }
    );
  }

  const fields = Object.entries(payload);
  const activityMessages: string[] = [];

  if (payload.product && payload.product !== company.product) {
    activityMessages.push(`Producto: ${company.product} -> ${payload.product}`);
  }

  if (
    payload.contract_status &&
    payload.contract_status !== company.contract_status
  ) {
    activityMessages.push(
      `Situacion de contrato: ${company.contract_status} -> ${payload.contract_status}`
    );
  }

  if (
    payload.contact_source &&
    payload.contact_source !== company.contact_source
  ) {
    activityMessages.push(
      `Medio de contacto: ${company.contact_source} -> ${payload.contact_source}`
    );
  }

  if (
    "next_action_at" in payload &&
    payload.next_action_at !== company.next_action_at
  ) {
    activityMessages.push(
      `Proxima accion: ${formatDate(company.next_action_at)} -> ${formatDate(
        payload.next_action_at ?? null
      )}`
    );
  }

  if (activityMessages.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const assignments = fields.map(([key], index) => `${key} = $${index + 1}`);
  assignments.push(`updated_at = now()`);

  await withTransaction(async (client) => {
    await client.query(
      `update companies set ${assignments.join(", ")} where id = $${fields.length + 1}`,
      [...fields.map(([, value]) => value), id]
    );

    await client.query(
      `
        insert into company_activities (company_id, user_id, type, content)
        values ($1, $2, 'note', $3)
      `,
      [id, user.id, activityMessages.join(" | ")]
    );
  });

  return NextResponse.json({ ok: true });
}
