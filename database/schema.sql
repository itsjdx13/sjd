create extension if not exists pgcrypto;

create table if not exists workspaces (
  user_id uuid primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_updated_at_idx on workspaces (updated_at desc);

-- Replace the temporary single-user ID in app/api/sync/route.ts with an
-- authenticated user ID before exposing sync to more than one person.
