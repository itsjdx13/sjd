-- Optional cross-device sync. Run in the Supabase SQL editor.
create table if not exists public.portfolio_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_snapshots enable row level security;

create policy "Users read only their portfolio"
on public.portfolio_snapshots for select
using (auth.uid() = user_id);

create policy "Users insert only their portfolio"
on public.portfolio_snapshots for insert
with check (auth.uid() = user_id);

create policy "Users update only their portfolio"
on public.portfolio_snapshots for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
