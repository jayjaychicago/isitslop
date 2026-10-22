import type { Sql } from './db.ts';

/** Tiny JSON cache in Postgres: preview facts, the app installation token. Expired rows are overwritten on write and ignored on read. */
export async function cacheGet<T>(sql: Sql, key: string): Promise<T | null> {
  const rows = (await sql`select value from cache where key = ${key} and expires_at > now()`) as { value: T }[];
  return rows[0]?.value ?? null;
}

export async function cacheSet(sql: Sql, key: string, value: unknown, ttlSec: number): Promise<void> {
  await sql`
    insert into cache (key, value, expires_at) values (${key}, ${JSON.stringify(value)}::jsonb, now() + make_interval(secs => ${ttlSec}))
    on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at
  `;
}
