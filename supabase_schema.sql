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

-- ── Tier column on credits ──────────────────────────────────────────────────
alter table public.credits
  add column if not exists tier text not null default 'free'
    check (tier in ('free','prep','pro','team','enterprise'));

-- ============================================================
-- Phase 1 — Interview Prep tables
-- ============================================================

-- Challenge definitions (admin-managed via service role)
create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  category      text not null check (category in ('fundamentals','construction','algorithm','optimization')),
  difficulty    text not null check (difficulty in ('beginner','intermediate','advanced','expert')),
  description   text not null,
  hints         jsonb not null default '[]',
  constraints   jsonb not null,   -- {max_qubits, max_gates, time_limit_seconds}
  expected_sv   jsonb,            -- list of [re, im] pairs (null only for optimization category)
  optimal_gates int,
  is_active     boolean not null default true,
  created_at    timestamptz default now(),
  check (
    (category = 'optimization' and expected_sv is null) or
    (category <> 'optimization' and expected_sv is not null)
  )
);

alter table public.challenges enable row level security;
create policy "Anyone can read active challenges"
  on public.challenges for select
  using (is_active = true);

-- User submissions
create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  challenge_id  uuid references public.challenges(id) on delete cascade not null,
  gates         jsonb not null,
  score         int not null,
  correctness   int not null,
  efficiency    int not null,
  speed_score   int not null,
  time_taken_s  int not null,
  passed        boolean not null,
  circuit_qasm  text,
  submitted_at  timestamptz default now()
);

alter table public.submissions enable row level security;
create policy "Users can read own submissions"
  on public.submissions for select
  using (auth.uid() = user_id);
create policy "Users can insert own submissions"
  on public.submissions for insert
  with check (auth.uid() = user_id);

-- Leaderboard (best score per user per challenge — upserted by backend)
create table if not exists public.leaderboard (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  challenge_id  uuid references public.challenges(id) on delete cascade not null,
  best_score    int not null,
  best_gates    int not null,
  display_name  text,
  updated_at    timestamptz default now(),
  unique(user_id, challenge_id)
);

alter table public.leaderboard enable row level security;
create policy "Subscribers can read leaderboard"
  on public.leaderboard for select
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.credits c
      where c.user_id = auth.uid()
        and c.credits > 1
    )
  );

drop trigger if exists set_leaderboard_updated_at on public.leaderboard;
create trigger set_leaderboard_updated_at
  before update on public.leaderboard
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Phase 2 — Benchmarking Tool table
-- ============================================================

create table if not exists public.benchmark_runs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  template         text not null check (template in ('grover','rng','shor','qft','qaoa','freeform')),
  parameters       jsonb not null,
  quantum_result   jsonb not null,
  classical_result jsonb,
  speedup_factor   float,
  pdf_url          text,
  created_at       timestamptz default now()
);

alter table public.benchmark_runs enable row level security;
create policy "Users can read own benchmark runs"
  on public.benchmark_runs for select
  using (auth.uid() = user_id);
create policy "Users can insert own benchmark runs"
  on public.benchmark_runs for insert
  with check (auth.uid() = user_id);
create policy "Users can delete own benchmark runs"
  on public.benchmark_runs for delete
  using (auth.uid() = user_id);
