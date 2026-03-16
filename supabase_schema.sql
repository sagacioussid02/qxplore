-- ============================================================
-- Quantumanic: Supabase schema
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Credits table
create table if not exists public.credits (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  credits     integer not null default 1,
  updated_at  timestamptz default now()
);

-- Row-level security
alter table public.credits enable row level security;

-- Users can only read their own row
create policy "Users can view own credits"
  on public.credits for select
  using (auth.uid() = user_id);

-- Service role (backend) can update — no policy needed for service_role
-- (service_role bypasses RLS by default)

-- ── Auto-create 1 credit on signup ─────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.credits (user_id, credits)
  values (new.id, 1)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Auto-update updated_at ──────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_credits_updated_at on public.credits;
create trigger set_credits_updated_at
  before update on public.credits
  for each row execute procedure public.set_updated_at();
