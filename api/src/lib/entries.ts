import type { Sql } from './db.ts';

export type EntryRow = {
  id: string;
  url: string;
  kind: 'site' | 'github';
  domain: string;
  title: string | null;
  created_at: string;
  verified_at: string | null;
  owner_key_hash: string | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
};

export type GradeRow = {
  id: string;
  entry_id: string;
  critics_score: number;
  people_score: number | null;
  overall: number | null;
  verdict: string;
  critics_breakdown: unknown;
  people_input: unknown;
  heuristics_version: string;
  created_at: string;
};

export type AppealRow = {
  id: string;
  entry_id: string;
  grade_id: string | null;
  text: string;
  status: string;
  response: string | null;
  created_at: string;
  resolved_at: string | null;
};

export function publicEntry(e: EntryRow) {
  return {
    id: e.id,
    url: e.url,
    kind: e.kind,
    domain: e.domain,
    title: e.title,
    createdAt: e.created_at,
    verified: !!e.verified_at,
    verifiedAt: e.verified_at,
  };
}

export function publicGrade(g: GradeRow) {
  return {
    id: g.id,
    critics: g.critics_score,
    people: g.people_score,
    overall: g.overall,
    verdict: g.verdict,
    criticsBreakdown: g.critics_breakdown,
    peopleInput: g.people_input,
    heuristicsVersion: g.heuristics_version,
    createdAt: g.created_at,
  };
}

export function publicAppeal(a: AppealRow) {
  return { id: a.id, gradeId: a.grade_id, text: a.text, status: a.status, response: a.response, createdAt: a.created_at, resolvedAt: a.resolved_at };
}

export async function getEntry(sql: Sql, id: string): Promise<EntryRow | null> {
  const rows = (await sql`select * from entries where id = ${id}`) as EntryRow[];
  return rows[0] ?? null;
}

export async function latestGrade(sql: Sql, entryId: string): Promise<GradeRow | null> {
  const rows = (await sql`select * from grades where entry_id = ${entryId} order by created_at desc limit 1`) as GradeRow[];
  return rows[0] ?? null;
}
