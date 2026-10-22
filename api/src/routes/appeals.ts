import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { getEntry, latestGrade, publicAppeal, type AppealRow } from '../lib/entries.ts';
import { requireOwner } from './grade.ts';

export const appeals = new Hono<{ Bindings: Env }>();

appeals.post('/entries/:id/appeals', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  if (!(await requireOwner(c, e, sql))) return c.json({ error: 'sign in as the owner' }, 401);
  if (!(await rateLimit(sql, `appeal:${e.id}`, 3, 86400 * 7))) return c.json({ error: 'at most 3 appeals per entry per week' }, 429);
  const body = await c.req.json().catch(() => ({}));
  const text = String(body.text ?? '').trim();
  if (text.length < 20 || text.length > 4000) return c.json({ error: 'appeal text must be 20 to 4000 characters' }, 400);
  const g = await latestGrade(sql, e.id);
  if (!g) return c.json({ error: 'nothing to appeal: no grade yet' }, 409);
  const rows = (await sql`insert into appeals (entry_id, grade_id, text) values (${e.id}, ${g.id}, ${text}) returning *`) as AppealRow[];
  return c.json({ appeal: publicAppeal(rows[0]), note: 'Appeals are public. Maintainers resolve them by fixing a rule for everyone or by explaining why the rule stands.' }, 201);
});

appeals.post('/appeals/:id/resolve', async (c) => {
  const auth = (c.req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!c.env.ADMIN_TOKEN || auth !== c.env.ADMIN_TOKEN) return c.json({ error: 'unauthorized' }, 401);
  const sql = db(c.env.DATABASE_URL);
  const body = await c.req.json().catch(() => ({}));
  const status = String(body.status ?? '');
  if (!['accepted', 'rejected'].includes(status)) return c.json({ error: 'status must be accepted or rejected' }, 400);
  const response = String(body.response ?? '').trim();
  if (!response) return c.json({ error: 'a public response is required' }, 400);
  const rows = (await sql`update appeals set status = ${status}, response = ${response}, resolved_at = now() where id = ${c.req.param('id')} returning *`) as AppealRow[];
  if (!rows[0]) return c.json({ error: 'not found' }, 404);
  return c.json({ appeal: publicAppeal(rows[0]) });
});
