import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { env } from "@/lib/env";

const globalForDb = globalThis as typeof globalThis & {
  miniCrmPool?: Pool;
};

export const pool =
  globalForDb.miniCrmPool ??
  new Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseUrl.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

if (env.nodeEnv !== "production") {
  globalForDb.miniCrmPool = pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
