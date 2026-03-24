import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { UserProfile } from "@/lib/types";

export async function getAuthContext() {
  const session = await getSession();

  if (!session) {
    return { user: null, profile: null as UserProfile | null };
  }

  const profile = await queryOne<
    UserProfile & {
      office_name: string | null;
    }
  >(
    `
      select
        u.id,
        u.name,
        u.email,
        u.role,
        u.office_id,
        o.name as office_name,
        u.is_active,
        u.created_at
      from users u
      join offices o on o.id = u.office_id
      where u.id = $1
      limit 1
    `,
    [session.userId]
  );

  if (!profile) {
    return { user: null, profile: null as UserProfile | null };
  }

  return {
    user: {
      id: profile.id,
      email: profile.email,
    },
    profile,
  };
}
