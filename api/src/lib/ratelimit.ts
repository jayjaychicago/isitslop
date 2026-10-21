import type { Sql } from './db.ts';

/** Crude fixed-window limiter backed by Postgres. Portable, free, good enough for v0. */
export async function rateLimit(sql: Sql, key: string, limit: number, windowSec: number): Promise<boolean> {
  const rows = (await sql`
    insert into rate_limits (key, count, window_end)
    values (${key}, 1, now() + make_interval(secs => ${windowSec}))
    on conflict (key) do update set
      count = case when rate_limits.window_end < now() then 1 else rate_limits.count + 1 end,
      window_end = case when rate_limits.window_end < now() then now() + make_interval(secs => ${windowSec}) else rate_limits.window_end end
    returning count
  `) as { count: number }[];
  return rows[0].count <= limit;
}
