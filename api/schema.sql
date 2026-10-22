-- isitslop index schema. Idempotent; safe to re-run.

create extension if not exists pgcrypto;

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
  github_token_expires_at timestamptz
);
alter table entries add column if not exists repo_url text;
alter table entries add column if not exists github_login text;
alter table entries add column if not exists github_token text;
alter table entries add column if not exists github_refresh_token text;
alter table entries add column if not exists github_token_expires_at timestamptz;
create index if not exists entries_domain_idx on entries (domain);
create index if not exists entries_created_idx on entries (created_at desc);

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
alter table verifications drop constraint if exists verifications_method_check;
alter table verifications add constraint verifications_method_check check (method in ('dns', 'file', 'email', 'github'));

create table if not exists grades (
  id                 uuid primary key default gen_random_uuid(),
  entry_id           uuid not null references entries(id) on delete cascade,
  quality_score      int not null,
  popularity_score   int not null default 0,
  overall            int not null default 0,
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

-- crude per-IP rate limiting, portable across hosts
create table if not exists rate_limits (
  key        text primary key,
  count      int not null default 0,
  window_end timestamptz not null
);
