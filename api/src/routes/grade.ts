import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { TERMS_VERSION } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { sha256 } from '../lib/crypto.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { normalizeTarget } from '../lib/url.ts';
import { fetchTargetText, mergeExtracted } from '../lib/fetch.ts';
import { scoreCritics } from '../heuristics/critics.ts';
import { scorePeople, validatePeople } from '../heuristics/people.ts';
import { overall, verdict } from '../heuristics/verdict.ts';
import { getEntry, publicGrade, type EntryRow, type GradeRow } from '../lib/entries.ts';

export const grade = new Hono<{ Bindings: Env }>();

export async function requireOwner(c: { req: { header: (n: string) => string | undefined } }, e: EntryRow): Promise<boolean> {
  const auth = c.req.header('authorization') ?? '';
  const key = auth.replace(/^Bearer\s+/i, '').trim();
  if (!key || !e.owner_key_hash) return false;
  return (await sha256(key)) === e.owner_key_hash;
}

grade.post('/entries/:id/grade', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  if (!e.verified_at) return c.json({ error: 'entry is not verified; only the verified owner can request a grade' }, 403);
  if (!(await requireOwner(c, e))) return c.json({ error: 'invalid owner key' }, 401);
  if (!(await rateLimit(sql, `grade:${e.id}`, 5, 86400))) return c.json({ error: 'at most 5 grades per entry per day' }, 429);

  const body = await c.req.json().catch(() => ({}));
  if (body.acceptTerms !== true) {
    return c.json({ error: `you must accept the terms (version ${TERMS_VERSION}) by sending acceptTerms: true`, termsUrl: `${c.env.PUBLIC_SITE_URL}/terms`, termsVersion: TERMS_VERSION }, 400);
  }

  let peopleInput = null;
  let people = null;
  if (body.people !== undefined && body.people !== null) {
    const p = validatePeople(body.people);
    if (typeof p === 'string') return c.json({ error: p }, 400);
    peopleInput = p;
    people = scorePeople(p);
  }

  const t = normalizeTarget(e.url);
  if (typeof t === 'string') return c.json({ error: t }, 400);
  const fetched = await fetchTargetText(t);
  if ('error' in fetched) return c.json({ error: fetched.error }, 422);
  let extracted = fetched.extracted;
  let source = fetched.source;
  if (e.kind === 'site' && e.repo_url) {
    // A site with a linked repo is graded on the landing page plus the README.
    const rt = normalizeTarget(e.repo_url);
    if (typeof rt !== 'string') {
      const rf = await fetchTargetText(rt);
      if (!('error' in rf)) {
        extracted = mergeExtracted(fetched.extracted, rf.extracted);
        source = `${fetched.source} + ${rf.source}`;
      }
    }
  }
  const critics = scoreCritics(extracted);
  // No usage numbers is not "unknown". Nobody using it is a zero.
  const peopleScore = people?.score ?? 0;
  const v = verdict(critics.score, peopleScore);
  const ov = overall(critics.score, peopleScore);

  await sql`update entries set terms_version = ${TERMS_VERSION}, terms_accepted_at = now(), title = ${extracted.title || e.title} where id = ${e.id}`;
  const rows = (await sql`
    insert into grades (entry_id, critics_score, people_score, overall, verdict, critics_breakdown, people_input, heuristics_version)
    values (${e.id}, ${critics.score}, ${peopleScore}, ${ov}, ${v}, ${JSON.stringify({ ...critics, source })}::jsonb, ${peopleInput ? JSON.stringify({ ...peopleInput, ...people }) : null}::jsonb, ${critics.version})
    returning *
  `) as GradeRow[];
  return c.json({ grade: publicGrade(rows[0]) }, 201);
});
