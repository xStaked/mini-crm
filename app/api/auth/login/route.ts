import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { setSession } from "@/lib/session";

type LoginRow = {
  id: string;
  email: string;
  password_hash: string;
  is_active: boolean;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await queryOne<LoginRow>(
    `
      select id, email, password_hash, is_active
      from users
      where lower(email) = $1
      limit 1
    `,
    [email]
  );

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!user.is_active) {
    return NextResponse.json({ error: "User inactive" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  setSession(response, { userId: user.id, email: user.email });
  return response;
}
