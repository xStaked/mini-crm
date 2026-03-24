import type { PoolClient } from "pg";
import { pool } from "@/lib/db";

type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  meta?: Record<string, string | number | boolean | null>;
};

export async function notifyUsers(
  db: Pick<PoolClient, "query"> = pool,
  notifications: NotificationInput[]
) {
  if (notifications.length === 0) return;

  const values: unknown[] = [];
  const placeholders = notifications.map((item, index) => {
    const offset = index * 5;
    values.push(
      item.userId,
      item.type,
      item.title,
      item.message,
      JSON.stringify(item.meta ?? {})
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}::jsonb)`;
  });

  await db.query(
    `
      insert into notifications (user_id, type, title, message, meta)
      values ${placeholders.join(", ")}
    `,
    values
  );
}
