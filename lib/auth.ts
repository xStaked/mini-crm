import { createClient as createServerClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types";

export async function getAuthContext() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null as UserProfile | null };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id,name,email,role,office_id,is_active,created_at,offices(name)")
    .eq("id", user.id)
    .single();

  const mappedProfile = profile
    ? {
        ...(profile as Omit<UserProfile, "office_name"> & {
          offices?: { name: string }[] | null;
        }),
        office_name: (profile as { offices?: { name: string }[] | null }).offices?.[0]
          ?.name,
      }
    : null;

  return {
    supabase,
    user,
    profile: (mappedProfile as UserProfile | null) ?? null,
  };
}
