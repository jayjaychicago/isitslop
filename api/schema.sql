-- isitslop index schema. Idempotent; safe to re-run.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists entries (
  id            uuid primary key default gen_random_uuid(),
  url           text not null unique,
  kind          text not null check (kind in ('site', 'github')),
  domain        text not null,
  title         text,
  created_at    timestamptz not null default now(),
  verified_at   timestamptz,
  owner_key_hash text,
  terms_version text,
  terms_accepted_at timestamptz,
  repo_url      text,
  github_login  text,
  github_token  text,
  github_refresh_token text,
  github_token_expires_at timestamptz,
  analytics_provider text,
  analytics_config text
);
alter table entries add column if not exists repo_url text;
alter table entries add column if not exists github_login text;
alter table entries add column if not exists github_token text;
alter table entries add column if not exists github_refresh_token text;
alter table entries add column if not exists github_token_expires_at timestamptz;
alter table entries add column if not exists analytics_provider text;
alter table entries add column if not exists analytics_config text;
create index if not exists entries_domain_idx on entries (domain);
create index if not exists entries_created_idx on entries (created_at desc);
create index if not exists entries_url_trgm on entries using gin (url gin_trgm_ops);
create index if not exists entries_title_trgm on entries using gin (coalesce(title,'') gin_trgm_ops);

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  github_id     bigint not null unique,
  github_login  text not null,
  github_token  text,
  github_refresh_token text,
  github_token_expires_at timestamptz,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create table if not exists sessions (
  id          text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days'
);
create index if not exists sessions_user_idx on sessions (user_id);

alter table entries add column if not exists owner_user_id uuid references users(id) on delete set null;
alter table entries add column if not exists repo_private boolean not null default false;
create index if not exists entries_owner_idx on entries (owner_user_id);

create table if not exists verifications (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references entries(id) on delete cascade,
  method      text not null check (method in ('dns', 'file', 'email', 'github')),
  token       text not null,
  email       text,
  code_hash   text,
  status      text not null default 'pending' check (status in ('pending', 'verified', 'expired')),
  attempts    int not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '24 hours'
);
create index if not exists verifications_entry_idx on verifications (entry_id, created_at desc);
alter table verifications alter column entry_id drop not null;
alter table verifications add column if not exists url text;
alter table verifications add column if not exists domain text;
alter table verifications add column if not exists user_id uuid references users(id) on delete cascade;
alter table verifications drop constraint if exists verifications_method_check;
alter table verifications add constraint verifications_method_check check (method in ('dns', 'file', 'email', 'github'));

create table if not exists grades (
  id                 uuid primary key default gen_random_uuid(),
  entry_id           uuid not null references entries(id) on delete cascade,
  quality_score      int,
  popularity_score   int,
  sloppy             int,
  verdict            text not null,
  quality_breakdown  jsonb not null,
  popularity_input   jsonb,
  heuristics_version text not null,
  created_at         timestamptz not null default now()
);
create index if not exists grades_entry_idx on grades (entry_id, created_at desc);
-- 0.3.0 rename: critics/people -> quality/popularity (no-op on fresh databases)
do $$ begin
  if exists (select 1 from information_schema.columns where table_name='grades' and column_name='critics_score') then
    alter table grades rename column critics_score to quality_score;
    alter table grades rename column people_score to popularity_score;
    alter table grades rename column critics_breakdown to quality_breakdown;
    alter table grades rename column people_input to popularity_input;
    update grades set popularity_score = 0 where popularity_score is null;
    update grades set overall = 0 where overall is null;
    alter table grades alter column popularity_score set not null, alter column popularity_score set default 0;
    alter table grades alter column overall set not null, alter column overall set default 0;
  end if;
end $$;

-- 0.7.0: the headline number is percent sloppy (the old overall, inverted: 0 overall = 100 sloppy)
do $$ begin
  if exists (select 1 from information_schema.columns where table_name='grades' and column_name='overall') then
    alter table grades rename column overall to sloppy;
    update grades set sloppy = 100 - sloppy where sloppy is not null;
  end if;
end $$;

create table if not exists appeals (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references entries(id) on delete cascade,
  grade_id    uuid references grades(id) on delete set null,
  text        text not null,
  status      text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  response    text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists appeals_entry_idx on appeals (entry_id, created_at desc);

-- 0.6.0: two-word verdicts (fringe/popular + slop/craft); recompute from scores
update grades set verdict = (case when popularity_score >= 50 then 'popular' else 'fringe' end) || '_' || (case when quality_score >= 50 then 'craft' else 'slop' end)
  where verdict in ('not_slop', 'mixed', 'slop');

-- 0.6.1: unknown is null, not zero
alter table grades alter column quality_score drop not null;
alter table grades alter column popularity_score drop not null, alter column popularity_score drop default;
alter table grades alter column sloppy drop not null, alter column sloppy drop default;

-- crude per-IP rate limiting, portable across hosts
create table if not exists cache (
  key        text primary key,
  value      jsonb not null,
  expires_at timestamptz not null
);

create table if not exists rate_limits (
  key        text primary key,
  count      int not null default 0,
  window_end timestamptz not null
);

-- 0.8.0: a grade keeps nothing from Google. The raw counts in older grades become the two subscores (bands out of 100).
with src as (
  select id, (popularity_input->>'visitors')::numeric as v, coalesce((popularity_input->>'returning')::numeric, 0) as rt, popularity_input->>'window' as w
  from grades where popularity_input ? 'visitors'
), calc as (
  select id, w, v,
    case when v < 100 then 0 when v < 1000 then 0.3*(log(v)-2) when v < 10000 then 0.3+0.3*(log(v)-3)
         when v < 100000 then 0.6+0.25*(log(v)-4) when v < 1000000 then 0.85+0.15*(log(v)-5) else 1 end as reach,
    case when v <= 0 then 0 else least(rt, v)/v end as r
  from src
)
update grades g set popularity_input = jsonb_build_object(
  'provider', 'ga4', 'window', coalesce(c.w, '30d'),
  'reach', round(100*c.reach)::int,
  'returning', round(100*(case when c.r <= 0 then 0 when c.r <= 0.1 then 3*c.r when c.r <= 0.25 then 0.3+2*(c.r-0.1)
                               when c.r <= 0.4 then 0.6+(0.25/0.15)*(c.r-0.25) when c.r <= 0.6 then 0.85+0.75*(c.r-0.4) else 1 end))::int,
  'note', case when c.v = 0 then 'No visitors in the last 30 days.' else 'Read from Google Analytics, last 30 days.' end,
  'version', '0.6.0')
from calc c where g.id = c.id;
