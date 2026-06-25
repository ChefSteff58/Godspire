-- ============================================================
-- Godspire — database schema. Run ONCE in the Supabase SQL editor.
-- Paste the whole file and Run. Order matters: tables -> RLS -> triggers.
-- ============================================================

-- 1) PROFILES — identity (one row per auth user). The SINGLE source of truth for
--    display name + guest flag. The DB trigger (below) is the sole writer of is_anonymous.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Mortal'
               check (char_length(trim(display_name)) between 1 and 32),
  is_anonymous boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2) PLAYER_PROGRESS — the save (gameplay only; one row per user). Derived values
--    (level, available points) are NOT stored — they're computed from favor + unlocked_nodes.
create table if not exists public.player_progress (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  favor          bigint not null default 0 check (favor >= 0),
  unlocked_nodes jsonb  not null default '[]'::jsonb,
  settings       jsonb  not null default '{}'::jsonb,
  stats          jsonb  not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

-- 3) SCORES — leaderboard (wired into gameplay at M7). user_id ON DELETE SET NULL so the
--    board survives account deletion; player_name is denormalized for fast, join-free reads.
create table if not exists public.scores (
  id           bigint generated always as identity primary key,
  user_id      uuid references auth.users(id) on delete set null,
  player_name  text not null default 'Mortal'
               check (char_length(trim(player_name)) between 1 and 32),
  highest_wave integer not null default 0 check (highest_wave between 0 and 1000),
  score        integer not null default 0 check (score >= 0),
  mode         text not null default 'standard' check (mode in ('standard','hard','endless')),
  created_at   timestamptz not null default now()
);
create index if not exists idx_scores_leaderboard
  on public.scores (mode, highest_wave desc, score desc);

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.player_progress enable row level security;
alter table public.scores          enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create policy "progress_select_own" on public.player_progress for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.player_progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.player_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "scores_select_public" on public.scores for select using (true);
create policy "scores_insert_own"    on public.scores for insert with check (auth.uid() = user_id);
-- (no update/delete policies on scores => clients can't tamper with past entries)

-- ============================================================
-- Triggers — auto-create rows on signup; keep is_anonymous synced on account link.
-- security definer + pinned search_path are REQUIRED (and avoid a privilege-escalation footgun).
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, is_anonymous)
  values (new.id, coalesce(new.is_anonymous, true))
  on conflict (id) do nothing;
  insert into public.player_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_updated()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set is_anonymous = coalesce(new.is_anonymous, false), updated_at = now()
   where id = new.id;
  return new;
end; $$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row
  when (old.is_anonymous is distinct from new.is_anonymous)
  execute function public.handle_user_updated();
