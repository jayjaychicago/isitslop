/**
 * Scheduled refresh. Runs once a day (see wrangler.toml [triggers]).
 * Every day: re-read popularity for every graded entry with analytics connected.
 * On the first of the month: re-read quality as well.
 * Grades are stored like any other, so the history shows the drift.
 */
import type { Env } from './lib/env.ts';
import { db } from './lib/db.ts';
import { runGrade } from './routes/grade.ts';
import type { EntryRow } from './lib/entries.ts';
import { sendEmail } from './lib/ses.ts';

/** Where the daily run reports failures. */
const OPERATOR_EMAIL = 'support@isitslop.org';

export async function scheduledRefresh(env: Env, now = new Date()): Promise<{ refreshed: number; failed: number; quality: boolean }> {
  const sql = db(env.DATABASE_URL);
  const refreshQuality = now.getUTCDate() === 1;
  const entries = (await sql`
    select e.* from entries e
    where e.verified_at is not null and e.owner_user_id is not null
      and exists (select 1 from grades g where g.entry_id = e.id)
      and (e.analytics_provider is not null or ${refreshQuality})
    order by e.created_at
  `) as EntryRow[];
  let refreshed = 0;
  const failures: string[] = [];
  for (const e of entries) {
    try {
      const r = await runGrade(env, sql, e, { refreshQuality, refreshPopularity: true, onAnalyticsError: 'degrade' });
      if (typeof r === 'string') failures.push(`${e.url}: ${r}`);
      else refreshed++;
    } catch (err) {
      failures.push(`${e.url}: ${(err as Error).message}`);
    }
  }
  for (const f of failures) console.warn('refresh failed', f);
  console.log(`scheduled refresh: ${refreshed} refreshed, ${failures.length} failed, quality=${refreshQuality}`);
  if (failures.length) {
    await sendEmail(env, OPERATOR_EMAIL, `isitslop refresh: ${failures.length} of ${entries.length} failed`, `Daily refresh at ${now.toISOString()} (quality=${refreshQuality}).\n\n${failures.join('\n')}\n\nEach failed entry keeps its previous grade.`).catch(() => undefined);
  }
  return { refreshed, failed: failures.length, quality: refreshQuality };
}
