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
  terms_accepted_at timestamptz
);
create index if not exists entries_domain_idx on entries (domain);
create index if not exists entries_created_idx on entries (created_at desc);

create table if not exists verifications (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references entries(id) on delete cascade,
  method      text not null check (method in ('dns', 'file', 'email', 'repo_file')),
  token       text not null,
  email       text,
  code_hash   text,
  status      text not null default 'pending' check (status in ('pending', 'verified', 'expired')),
  attempts    int not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '24 hours'
);
create index if not exists verifications_entry_idx on verifications (entry_id, created_at desc);

create table if not exists grades (
  id                 uuid primary key default gen_random_uuid(),
  entry_id           uuid not null references entries(id) on delete cascade,
  critics_score      int not null,
  people_score       int,
  overall            int,
  verdict            text not null,
  critics_breakdown  jsonb not null,
  people_input       jsonb,
  heuristics_version text not null,
  created_at         timestamptz not null default now()
);
create index if not exists grades_entry_idx on grades (entry_id, created_at desc);

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
