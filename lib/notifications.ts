import type { SupabaseClient } from "@supabase/supabase-js";

type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  meta?: Record<string, string | number | boolean | null>;
};

export async function notifyUsers(
  supabase: SupabaseClient,
  notifications: NotificationInput[]
) {
  if (notifications.length === 0) return;

  await supabase.from("notifications").insert(
    notifications.map((item) => ({
      user_id: item.userId,
      type: item.type,
      title: item.title,
      message: item.message,
      meta: item.meta ?? {},
    }))
  );
}
